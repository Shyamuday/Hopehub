export function groupHelpHelpSections(input: {
  canUseStaffTools: boolean;
  canUseModTools: boolean;
  canUseAdminTools: boolean;
  isControlGroup: boolean;
  muteMinutes: string;
}) {
  return [
    `*Hope Hub bot help*

*Member commands*
/start — open the main menu
/help — show this guide
/rule or /rules — community rules
/support — private support
/get <name> or #name — open a saved note
/notes — list saved notes
/warnings — warning settings and your count
/warns — your active warning reasons
/disabled — current disabled commands
/disableable — commands admins can disable
/filters — list active reply filters
/cleancommandtypes, /cleanmsgtypes, /cleanservicetypes — available cleanup types
/me — your group profile
/id — Telegram and target-group IDs
/staffid — look up staff by username
/report — report a replied message
/admin or /alertadmin — alert the community team
/forget — delete retained Group Help data`,
    input.canUseStaffTools
      ? `*Helper tools*
/warn <id/username/reply> [reason]
/dwarn [reason] — reply: delete and warn
/swarn <id/username/reply> [reason] — silent warning
/unwarn or /rmwarn — remove latest warning
/warns <id/username/reply> — view warning reasons
/info, /history, /member — member details
/perms — member bot permissions
/delete or /del — delete a replied message
/geturl — get a main-group message link
/clearwarnings — clear one member’s warnings
/adminlist, /staff, /stats — group information`
      : '',
    input.canUseModTools
      ? `*Moderator tools — Rose-compatible syntax*
Reply to a message, or add <user_id or @username> before the reason.
/ban, /mute — permanent action; /kick — remove member
/tban, /tmute <time> [reason] — timed action (15m, 3h, 2d, 1w)
/dban, /dmute, /dkick — delete replied message plus action
/sban, /smute, /skick — silent action
/unban, /unmute — undo action
/ro, /unro — add or remove read-only mode
/resetwarn — clear all member warnings
Legacy /delwarn, /delban, /delmute and /delkick remain supported.
Default automated-warning mute: ${input.muteMinutes} minutes.`
      : '',
    input.canUseAdminTools
      ? `*Administrator and role tools*
/send — post in the target group
/promote — promote a member; /demote or /unadmin — demote
/title, /untitle — manage administrator titles
/helper, /unhelper — manage Helper role
/mod, /moderator — assign Moderator role
/unmod, /unmoderator — remove Moderator role
/free, /unfree — manage Free role
/pin, /unpin, /unpinall, /pinned — manage pinned messages
/welcome on|off — control welcome messages
/filter — add reply; /stop or /unfilter — remove reply
/stopall — remove all filters (owner only)
/save, /clear, /privatenotes — manage notes
/blockword, /unblockword, /blockwords — manage safety phrases
/lock, /unlock — manage locked content or group state
/lockdown [minutes] — temporarily lock the group
/cleancommand, /keepcommand — command cleanup
/cleanmsg, /keepmsg — bot-message cleanup
/cleanservice, /nocleanservice — Telegram service-message cleanup
/setwarnlimit, /setwarnmode, /setwarntime, /warntime — warning policy
/reports on|off — user reports
/disable, /enable, /disabledel, /disableadmin — command disabling
/adminerror on|off — permission-error messages
/botaudit — verify bot rights; /smoketest — safe configuration test
/settings — private editor
/setlog — moderation log; /setofftopic — off-topic group`
      : '',
    input.isControlGroup && input.canUseStaffTools
      ? `*Private admin-group syntax*
/info, /history, /member, /perms <user_id or @username>
/ban, /mute, /kick <user_id or @username> [reason]
/tban, /tmute <user_id or @username> <time> [reason]
/sban, /smute, /skick <user_id or @username> [reason]
/delete <main_message_id> [reason]
/dban, /dmute, /dkick <user> <main_message_id> [reason]
/geturl <main_message_id>
/clearwarnings <user_id or @username>`
      : '',
    input.isControlGroup && input.canUseAdminTools
      ? `*Private admin-group administration*
/promote <user_id or @username> [title]
/demote or /unadmin <user_id or @username>
/title <user_id or @username> <title>; /untitle <user_id or @username>
/helper, /mod, /moderator, /free <user_id or @username>
/unhelper, /unmod, /unmoderator, /unfree <user_id or @username>
/pin <main_message_id> [notify]
All policy commands above apply to the configured main group.`
      : '',
    'For sensitive staff results, run the command in the configured private admin group.'
  ].filter(Boolean);
}
