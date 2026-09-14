import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  addTelegramGroupWarning,
  clearTelegramGroupWarnings,
  removeLatestTelegramGroupWarning
} from './telegram-community-bots.store.js';
import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';
import {
  applyGroupHelpMemberAction,
  applyGroupHelpWarningLimitAction,
  deleteGroupHelpMessage,
  sendGroupHelpActivityLog,
  sendModerationLog,
  sendTemporaryGroupHelpMessage
} from './telegram-group-help.actions.js';
import {
  canUseGroupHelpCommand,
  canUseGroupHelpAdminCommand,
  canUseGroupHelpBanCommand,
  sendGroupHelpPermissionDenied
} from './telegram-group-help.permissions.js';
import {
  groupHelpCommandFailureMessage,
  messageForGroupHelpTarget,
  resolveGroupHelpCommandContext
} from './telegram-group-help.command-context.js';
import { requestGroupHelpCommandConfirmation } from './telegram-group-help.command-confirmation.js';
import { groupHelpAdminMentionReplyTarget } from './telegram-group-help.admin-mentions.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';
import { resolveGroupHelpMember } from './telegram-group-help.member-resolution.js';
import {
  groupHelpBanCooldownRemainingSeconds,
  groupHelpBanCooldownSeconds,
  recordGroupHelpBanCooldown
} from './telegram-group-help.ban-guard.js';
import { recordGroupHelpCommandAudit } from './telegram-group-help.command-audit.js';
import { shouldDeleteModerationTarget } from './telegram-group-help.command-cleanup.js';
import {
  groupHelpMemberModerationNotice,
  groupHelpModerationUntilLabel,
  groupHelpModerationCommandSpec,
  groupHelpModerationUsage,
  parseGroupHelpModerationDuration
} from './telegram-group-help.moderation-command.js';
import { groupHelpWarnPolicySummary } from './telegram-group-help.warning-policy.js';

export async function handleGroupHelpStaffCommand(
  message: CommunityTelegramMessage,
  values: Record<string, string>
) {
  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  const chatId = String(message.chat.id);
  const parts = (message.text || '').trim().split(/\s+/);

  // Commands from either configured private control group act on the main group.
  const context = await resolveGroupHelpCommandContext(message);
  const targetChatId = context.targetChatId;
  const isCrossGroup = context.isControlGroup;
  const permissionMessage = messageForGroupHelpTarget(message, targetChatId);
  const commandReplyValues = { ...values, telegramGroupHelpAutoDeleteSeconds: '60' };
  const sendCommandReply = (text: string) =>
    sendTemporaryGroupHelpMessage(chatId, text, commandReplyValues);

  if (command === '/send') {
    if (!message.from || !(await canUseGroupHelpAdminCommand(permissionMessage, values, '/send'))) {
      await sendGroupHelpPermissionDenied(message, 'ADMIN', chatId, values);
      return true;
    }
    const textToSend = parts.slice(1).join(' ').trim();
    if (!textToSend) {
      await sendCommandReply(
        'Usage: reply to an Administrator request with /send <message>, or use /send <message> to post in the main group as Hope Hub bot.'
      );
      return true;
    }
    const replyTarget = isCrossGroup
      ? await groupHelpAdminMentionReplyTarget(chatId, message.reply_to_message?.message_id)
      : null;
    const destinationChatId = replyTarget?.targetChatId || targetChatId;
    const posted = await sendCommunityMessage(GROUP_HELP_BOT_SLUG, destinationChatId, textToSend, {
      ...(replyTarget?.targetMessageId ? { reply_to_message_id: replyTarget.targetMessageId } : {}),
      ...(replyTarget?.messageThreadId
        ? { message_thread_id: replyTarget.messageThreadId }
        : message.message_thread_id && !isCrossGroup
          ? { message_thread_id: message.message_thread_id }
          : {})
    });
    await sendGroupHelpActivityLog(values, 'Administrator response posted', [
      `Posted by: ${telegramPersonLogLabel(message.from, 'Administrator')}`,
      `Group: ${destinationChatId}`,
      replyTarget ? `In reply to: ${replyTarget.memberLabel}` : 'Reply target: main group',
      `Bot message: ${posted.message_id}`
    ]);
    if (isCrossGroup) {
      await sendCommandReply(
        `Posted in the main group as Hope Hub bot${replyTarget ? ` in reply to ${replyTarget.memberLabel}` : ''}.`
      );
    }
    return true;
  }

  // ── Moderation commands ──────────────────────────────────────────────────

  const moderationCommand =
    /^\/(warn|dwarn|swarn|unwarn|rmwarn|delete|del|mute|tmute|dmute|smute|unmute|ban|tban|dban|sban|unban|kick|dkick|skick|delwarn|delmute|delban|delkick|ro|unro)$/i.exec(
      command
    );

  if (moderationCommand) {
    const commandName = moderationCommand[1].toLowerCase();
    const commandSpec = groupHelpModerationCommandSpec(commandName)!;
    const canonicalName = commandSpec.action;

    const requiredRole = ['mute', 'unmute', 'ban', 'unban', 'kick', 'ro', 'unro'].includes(
      canonicalName
    )
      ? 'MODERATOR'
      : 'HELPER';

    const banCommand = canonicalName === 'ban';
    const permitted = banCommand
      ? await canUseGroupHelpBanCommand(permissionMessage, values)
      : await canUseGroupHelpCommand(
          permissionMessage,
          values,
          commandSpec.permissionCommand,
          requiredRole
        );
    if (!permitted) {
      await sendGroupHelpPermissionDenied(
        message,
        banCommand ? 'BAN_AUTHORITY' : requiredRole,
        chatId,
        values
      );
      return true;
    }
    const deleteFirst =
      shouldDeleteModerationTarget(commandName) &&
      (!commandSpec.silent || (!isCrossGroup && Boolean(message.reply_to_message)));
    const effectiveAction = canonicalName;

    // A command in another group cannot reply to a main-group message. Require
    // the exact message ID so the bot never reports a deletion it did not do.
    if (isCrossGroup && effectiveAction === 'delete') {
      const messageId = Number((parts[1] || '').replace(/^message:/i, ''));
      if (!Number.isInteger(messageId) || messageId <= 0) {
        await sendCommandReply(
          `Usage: ${command} <main_group_message_id> [reason]\nExample: ${command} 12345 harmful content`
        );
        return true;
      }
      const reason = parts.slice(2).join(' ').trim() || 'Manual deletion by community staff';
      await deleteGroupHelpMessage(targetChatId, messageId);
      await sendGroupHelpActivityLog(values, 'Main-group message deleted', [
        `Group ID: ${targetChatId}`,
        `Message ID: ${messageId}`,
        `Reason: ${reason}`,
        `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`
      ]);
      await sendCommandReply(`Deleted main-group message ${messageId}. Reason: ${reason}`);
      return true;
    }

    // Rose-compatible targeting: reply, numeric ID, or @username. A reply in
    // the private control group cannot identify a main-group message/member.
    let target = (!isCrossGroup ? message.reply_to_message?.from : undefined) as
      { id: number; first_name?: string; username?: string } | undefined;
    const usesExplicitTarget = !target;

    if (
      !isCrossGroup &&
      commandSpec.deleteTarget &&
      !commandSpec.silent &&
      !message.reply_to_message
    ) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        `${groupHelpModerationUsage(commandName, true)}\nDelete variants must reply to the message they should remove.`,
        values
      );
      return true;
    }

    if (usesExplicitTarget) {
      const arg = parts[1] || '';
      if (!arg) {
        await sendCommandReply(
          `${groupHelpModerationUsage(commandName, false)}\nExample target: @username or 123456789`
        );
        return true;
      }
      target = await resolveGroupHelpMember(targetChatId, arg);
      if (!target) {
        await sendCommandReply(
          `Could not find ${arg} in the target group. Use their Telegram ID, current @username, or reply to their message.`
        );
        return true;
      }
    }

    if (!target) return true;

    let crossGroupMessageId: number | null = null;
    if (isCrossGroup && deleteFirst) {
      crossGroupMessageId = Number((parts[2] || '').replace(/^message:/i, ''));
      if (!Number.isInteger(crossGroupMessageId) || crossGroupMessageId <= 0) {
        await sendCommandReply(
          `Usage: ${command} <user_id or @username> <main_group_message_id> [reason]`
        );
        return true;
      }
    }

    const durationIndex = usesExplicitTarget ? 2 : 1;
    const duration = commandSpec.timed
      ? parseGroupHelpModerationDuration(parts[durationIndex])
      : undefined;
    if (commandSpec.timed && !duration) {
      const usage = groupHelpModerationUsage(commandName, !usesExplicitTarget);
      if (isCrossGroup) await sendCommandReply(usage);
      else await sendTemporaryGroupHelpMessage(chatId, usage, values);
      return true;
    }
    const reasonStart = isCrossGroup
      ? deleteFirst
        ? 3
        : commandSpec.timed
          ? 3
          : 2
      : commandSpec.timed
        ? usesExplicitTarget
          ? 3
          : 2
        : usesExplicitTarget
          ? 2
          : 1;
    const reason =
      parts.slice(reasonStart).join(' ').trim() || `Manual ${canonicalName} by community staff`;
    let logReason = duration ? `${reason} (Duration: ${duration.input})` : reason;
    let appliedAction = effectiveAction;
    let warningCount: number | undefined;
    let warningLimitReached = false;
    let removeWarningCallbackData: string | undefined;

    // Ask only after the target and optional duration have been validated, so
    // malformed commands never create a misleading destructive-action prompt.
    if (
      ['ban', 'kick'].includes(canonicalName) &&
      (await requestGroupHelpCommandConfirmation({
        message,
        targetChatId,
        command
      }))
    ) {
      return true;
    }

    if (banCommand && message.from) {
      const remainingSeconds = await groupHelpBanCooldownRemainingSeconds({
        targetChatId,
        actorUserId: String(message.from.id),
        targetUserId: String(target.id)
      });
      if (remainingSeconds > 0) {
        const detail = `Duplicate ban blocked for ${target.id}; retry in ${remainingSeconds} seconds.`;
        await recordGroupHelpCommandAudit({
          message,
          targetChatId,
          status: 'DENIED',
          detail,
          logChatId: values.telegramGroupHelpLogChannelId
        });
        message._groupHelpAuditRecorded = true;
        await sendCommandReply(
          `No action was applied. This member was already banned by you recently; try again in ${remainingSeconds} seconds.`
        );
        return true;
      }
    }

    // Plain /warn records a warning but deliberately keeps the member's
    // message. Commands prefixed with /del remain the explicit delete+action
    // variants for content that must be removed from the public group.
    if (deleteFirst) {
      const messageId = isCrossGroup
        ? crossGroupMessageId
        : message.reply_to_message?.message_id || null;
      if (messageId) await deleteGroupHelpMessage(targetChatId, messageId);
    }

    if (effectiveAction === 'delete') {
      // deletion already done above
    } else if (effectiveAction === 'unwarn') {
      const warningPolicy = groupHelpWarnPolicySummary(values);
      const result = await removeLatestTelegramGroupWarning(
        targetChatId,
        String(target.id),
        warningPolicy.expiry.seconds
      );
      if (!result.removed) {
        const reply = 'This member has no recorded warnings to remove.';
        if (isCrossGroup) {
          await sendCommandReply(reply);
        } else {
          await sendTemporaryGroupHelpMessage(chatId, reply, values);
        }
        return true;
      }
    } else if (effectiveAction === 'warn') {
      const warningPolicy = groupHelpWarnPolicySummary(values);
      warningCount = await addTelegramGroupWarning({
        chatId: targetChatId,
        telegramUserId: String(target.id),
        reason,
        warningExpirySeconds: warningPolicy.expiry.seconds
      });
      if (warningCount >= warningPolicy.limit) {
        try {
          const mode = await applyGroupHelpWarningLimitAction(
            targetChatId,
            target.id,
            warningPolicy.mode.value,
            Number(values.telegramGroupHelpMuteMinutes || 60)
          );
          appliedAction = mode.action;
          logReason = `${reason} (warning-limit action: ${mode.value})`;
          warningLimitReached = true;
          await clearTelegramGroupWarnings(targetChatId, String(target.id));
        } catch (error) {
          await sendCommandReply(
            `The warning was recorded, but the configured follow-up action failed. ${groupHelpCommandFailureMessage(error)}`
          );
          if (isCrossGroup) {
            await sendGroupHelpActivityLog(values, 'Warning follow-up action failed', [
              'Action: warn',
              `Main group ID: ${targetChatId}`,
              `Member: ${telegramPersonLogLabel(target)}`,
              `Reason: ${reason}`,
              `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`,
              `Failure: ${groupHelpCommandFailureMessage(error)}`
            ]);
          } else if (message.reply_to_message) {
            await sendModerationLog(values, message.reply_to_message, reason, 'warn', {
              performedBy: message.from
            });
          }
          return true;
        }
      }
    } else if (effectiveAction === 'unmute' || effectiveAction === 'unro') {
      const chat = await callCommunityTelegramApi<{
        permissions?: Record<string, boolean>;
      }>(GROUP_HELP_BOT_SLUG, 'getChat', { chat_id: targetChatId });
      await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'restrictChatMember', {
        chat_id: targetChatId,
        user_id: target.id,
        permissions: chat.permissions || { can_send_messages: true }
      });
    } else if (effectiveAction === 'ro') {
      await callCommunityTelegramApi(GROUP_HELP_BOT_SLUG, 'restrictChatMember', {
        chat_id: targetChatId,
        user_id: target.id,
        until_date: 0,
        permissions: { can_send_messages: false }
      });
    } else {
      await applyGroupHelpMemberAction(
        targetChatId,
        target.id,
        appliedAction,
        Number(values.telegramGroupHelpMuteMinutes || 60),
        {
          ...(duration ? { durationSeconds: duration.seconds } : {}),
          ...(effectiveAction === 'mute' && !commandSpec.timed ? { permanentMute: true } : {})
        }
      );
    }

    if (banCommand && message.from) {
      const cooldownSeconds = groupHelpBanCooldownSeconds(
        values.telegramGroupHelpBanCooldownSeconds
      );
      await recordGroupHelpBanCooldown({
        targetChatId,
        actorUserId: String(message.from.id),
        targetUserId: String(target.id),
        seconds: cooldownSeconds
      });
      await recordGroupHelpCommandAudit({
        message,
        targetChatId,
        status: 'HANDLED',
        detail: `Ban applied to ${target.first_name || 'Telegram member'} (${target.id}). Reason: ${logReason}. Duplicate protection: ${cooldownSeconds}s.`,
        logChatId: values.telegramGroupHelpLogChannelId
      });
      message._groupHelpAuditRecorded = true;
    }

    if (isCrossGroup) {
      await sendGroupHelpActivityLog(values, 'Private admin command applied', [
        `Action: ${appliedAction}`,
        `Main group ID: ${targetChatId}`,
        `Member: ${telegramPersonLogLabel(target)}`,
        `Reason: ${logReason}`,
        `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`
      ]);
    } else {
      const moderationLog = await sendModerationLog(
        values,
        message.reply_to_message || { ...message, from: target as typeof message.from },
        logReason,
        appliedAction,
        {
          performedBy: message.from,
          includePublicControls:
            effectiveAction === 'warn' && appliedAction === 'warn' && !commandSpec.silent
        }
      );
      removeWarningCallbackData = moderationLog.removeWarningCallbackData;
    }

    const warningPolicy = groupHelpWarnPolicySummary(values);
    const warningModeDuration = warningPolicy.mode.value.split(/\s+/)[1];
    const durationLabel = warningLimitReached
      ? warningModeDuration ||
        (['ban', 'mute', 'ro'].includes(appliedAction) ? 'Permanent' : 'Immediate')
      : duration?.input ||
        (appliedAction === 'warn'
          ? warningPolicy.expiry.value === 'off'
            ? 'Until removed by a moderator'
            : warningPolicy.expiry.value
          : ['mute', 'ban', 'ro'].includes(appliedAction)
            ? 'Permanent'
            : 'Immediate');
    const actionLabels: Record<string, string> = {
      warn: 'Warned',
      unwarn: 'Warning removed',
      mute: 'Muted',
      unmute: 'Unmuted',
      ban: 'Banned',
      unban: 'Unbanned',
      kick: 'Removed from group',
      ro: 'Made read-only',
      unro: 'Read-only restriction removed'
    };
    const memberLabel = [
      target.first_name || 'Telegram member',
      target.username ? `(@${target.username})` : ''
    ]
      .filter(Boolean)
      .join(' ');
    const noticeDurationSeconds =
      duration?.seconds ||
      (warningLimitReached ? warningPolicy.mode.durationSeconds : undefined) ||
      (appliedAction === 'warn' ? warningPolicy.expiry.seconds : undefined);
    const clearNotice = groupHelpMemberModerationNotice({
      member: memberLabel,
      action: actionLabels[appliedAction] || appliedAction,
      duration: durationLabel,
      ...(noticeDurationSeconds
        ? {
            until: groupHelpModerationUntilLabel(noticeDurationSeconds)
          }
        : ['mute', 'ban', 'ro'].includes(appliedAction)
          ? { until: 'Removed by an administrator' }
          : {}),
      reason,
      ...(effectiveAction === 'warn' && warningCount !== undefined
        ? {
            warningStatus: warningLimitReached
              ? `${warningCount}/${warningPolicy.limit}; limit reached and warnings reset`
              : `${warningCount}/${warningPolicy.limit}`
          }
        : {})
    });
    const oneMinuteValues = {
      ...values,
      telegramGroupHelpAutoDeleteSeconds: '60',
      telegramCommunityDefaultTopicId: '0'
    };
    const shouldNotifyAffectedMember =
      ['warn', 'mute', 'ban'].includes(effectiveAction) || warningLimitReached;
    if (commandSpec.silent) {
      await deleteGroupHelpMessage(chatId, message.message_id).catch(() => null);
      return true;
    }

    const publicDestination = isCrossGroup && shouldNotifyAffectedMember ? targetChatId : chatId;
    await sendTemporaryGroupHelpMessage(
      publicDestination,
      clearNotice,
      { ...values, telegramGroupHelpAutoDeleteSeconds: '60' },
      {
        ...(removeWarningCallbackData
          ? {
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Remove warn', callback_data: removeWarningCallbackData }]
                ]
              }
            }
          : {})
      }
    );
    if (isCrossGroup && shouldNotifyAffectedMember) {
      await sendTemporaryGroupHelpMessage(
        chatId,
        `✅ Action applied in the target group.\n\n${clearNotice}`,
        oneMinuteValues,
        {},
        'action'
      );
    }
    return true;
  }

  // ── Role commands ────────────────────────────────────────────────────────

  const roleCommand = /^\/(helper|unhelper|moderator|unmoderator|mod|unmod|free|unfree)$/i.exec(
    command
  );
  if (!roleCommand) return false;

  if (!message.from || !(await canUseGroupHelpAdminCommand(permissionMessage, values, command))) {
    await sendGroupHelpPermissionDenied(message, 'ADMIN', chatId, values);
    return true;
  }

  const target =
    message.reply_to_message?.from || (await resolveGroupHelpMember(targetChatId, parts[1] || ''));
  if (!target) {
    const usage = `Reply to a member, or use ${command} <user_id or @username>.`;
    await sendTemporaryGroupHelpMessage(chatId, usage, values);
    return true;
  }

  const roleCommandName = roleCommand[1].toLowerCase();
  const role = ['moderator', 'unmoderator', 'mod', 'unmod'].includes(roleCommandName)
    ? 'MODERATOR'
    : 'HELPER';

  if (roleCommandName.startsWith('un')) {
    await prisma.telegramCommunityRoleAssignment.deleteMany({
      where: { chatId: targetChatId, telegramUserId: String(target.id), role }
    });
    await sendTemporaryGroupHelpMessage(
      chatId,
      `Removed ${role.toLowerCase()} role from ${target.first_name || 'this member'}.`,
      values
    );
  } else {
    await prisma.$transaction([
      prisma.telegramCommunityRoleAssignment.deleteMany({
        where: { chatId: targetChatId, telegramUserId: String(target.id) }
      }),
      prisma.telegramCommunityRoleAssignment.upsert({
        where: {
          chatId_telegramUserId_role: {
            chatId: targetChatId,
            telegramUserId: String(target.id),
            role
          }
        },
        create: {
          chatId: targetChatId,
          telegramUserId: String(target.id),
          role,
          assignedById: String(message.from.id)
        },
        update: { assignedById: String(message.from.id) }
      })
    ]);
    await sendTemporaryGroupHelpMessage(
      chatId,
      `${target.first_name || 'This member'} is now a ${role.toLowerCase()}.`,
      values
    );
  }

  await sendGroupHelpActivityLog(values, 'Community role updated', [
    `Group ID: ${targetChatId}`,
    `Member: ${telegramPersonLogLabel(target)}`,
    `Role: ${roleCommandName.startsWith('un') ? 'removed' : 'assigned'} ${role.toLowerCase()}`,
    `By: ${telegramPersonLogLabel(message.from, 'Administrator')}`
  ]);
  return true;
}
