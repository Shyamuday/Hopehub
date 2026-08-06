import { CareTeamMemberType, Prisma, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import {
  assertAssessmentAccess,
  getAssessmentAccessStatus,
  getAssessmentDefinition,
  scoreAssessment,
  type AssessmentDefinitionRecord
} from './assessment-definitions.js';
import {
  bookingConcernOptions,
  botSlugByKind,
  callbackTimeOptions,
  planTaskPresets,
  reviewPresets,
  supportConcernOptions,
  supportChannelOptions,
  volunteerConcernOptions
} from './telegram-bots.config.js';
import { answerTelegramCallback, sendTelegramMessage } from './telegram-bots.client.js';
import { adminUrl, callbackRows, menuCancelRows, webUrl } from './telegram-bots.ui.js';
import {
  cancelPending,
  finishSignup,
  replyMenu,
  requireLinked,
  showMe,
  showOnboarding,
  showSettings,
  startLink,
  startSignup,
  toggleDailyReminders,
  unlink,
  verifyLink
} from './telegram-bots.account.js';
import { answerButtonRows, assessmentNavRows } from './telegram-bots.assessment-ui.js';
import {
  chooseAvailabilityDay,
  chooseAvailabilityService,
  chooseAvailabilityTime,
  createAvailabilityRuleFromPreset,
  generateAvailabilitySlots,
  showProviderAvailability,
  toggleAvailabilityRule
} from './telegram-bots.availability.js';
import {
  escapeHtml,
  metadataOf,
  telegramDisplayName,
  todayStart
} from './telegram-bots.helpers.js';
import { helpText, startGuideText } from './telegram-bots.menus.js';
import {
  assessmentPaymentUrl,
  dashboardPaymentUrl,
  donationPaymentUrl,
  paymentHubRows,
  rupees,
  sessionPaymentUrl,
  volunteerApplicationUrl,
  volunteerTalkPaymentUrl,
  whatsappJoinButton,
  withTelegramSource
} from './telegram-bots.payments.js';
import {
  adminContributors,
  adminLeads,
  adminSummary,
  doctorQueue,
  setDoctorPresence
} from './telegram-bots.ops.js';
import {
  applyDoctorSessionOutcome,
  showDoctorOutcomeOptions,
  showDoctorOutcomeSessions
} from './telegram-bots.outcomes.js';
import {
  applyTemplateToProviderService,
  createProviderServiceFromTemplate,
  showProviderPricingTemplates,
  showProviderServices,
  toggleProviderService
} from './telegram-bots.provider-services.js';
import { adminQualitySummary } from './telegram-bots.quality.js';
import {
  ensureSession,
  logEvent,
  updateSession,
  type TelegramSession
} from './telegram-bots.sessions.js';
import { notifyAdminsAboutProviderApplication } from './provider-application-notifications.js';
import type {
  InlineButton,
  SessionMetadata,
  TelegramCallbackQuery,
  TelegramUpdate
} from './telegram-bots.types.js';
import { upsertWebsiteLead } from './website-leads.service.js';
import {
  assignWebsiteLead,
  isSafetyLead,
  listAssignableLeadProviders
} from './website-lead-assignments.js';

export {
  setTelegramCommands,
  setTelegramWebhook,
  telegramBotStatus,
  telegramBotToken,
  telegramWebhookSecret
} from './telegram-bots.client.js';
export { telegramBotKindFromSlug } from './telegram-bots.menus.js';
export type { TelegramUpdate } from './telegram-bots.types.js';

async function showPaymentHub(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Hope Hub payments</b>',
      'Use these secure website links from Telegram.',
      '',
      '• Session booking: pay full amount or deposit',
      '• Paid assessments: unlock and take tests',
      '• Pending payments: retry from dashboard',
      '• Listener talk/support: open paid support route',
      '• Donations: support Hope Hub work',
      '',
      'Payment is completed on the Hope Hub website through Razorpay.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: await paymentHubRows(session) }
  });
}

async function showWhatsAppJoin(kind: TelegramBotKind, session: TelegramSession) {
  const whatsappButton = await whatsappJoinButton();
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Join Hope Hub WhatsApp</b>',
      'Tap below to join the WhatsApp group/community link.',
      '',
      'Note: WhatsApp groups may show your phone number/name according to WhatsApp settings.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[whatsappButton], [{ text: 'Main menu', callback_data: 'common:menu' }]]
    }
  });
}

async function listAssessments(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;

  const definitions = await prisma.assessmentDefinition.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    take: 8,
    select: {
      id: true,
      title: true,
      category: true,
      accessMode: true,
      priceInPaise: true
    }
  });

  if (!definitions.length) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'No assessment tests are active right now. Please try again later.',
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return;
  }

  const paidAssessmentIds = definitions
    .filter((definition) => definition.accessMode === 'PAID')
    .map((definition) => definition.id);
  const activeGrants = paidAssessmentIds.length
    ? await prisma.assessmentAccessGrant.findMany({
        where: {
          userId: session.linkedUserId!,
          assessmentId: { in: paidAssessmentIds },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
        },
        select: { assessmentId: true }
      })
    : [];
  const unlockedAssessmentIds = new Set(activeGrants.map((grant) => grant.assessmentId));

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Choose an assessment</b>',
      'Answer by tapping buttons. Your result will be saved to your Hope Hub profile.',
      '',
      'For longer or paid tests, the bot may ask you to open the web app.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...definitions.map((definition) => [
          {
            text:
              definition.accessMode === 'PAID'
                ? `${unlockedAssessmentIds.has(definition.id) ? '✅' : '🔒'} ${definition.title}${unlockedAssessmentIds.has(definition.id) ? '' : ` ${rupees(definition.priceInPaise)}`}`
                : definition.title,
            callback_data: `assessment:start:${definition.id}`
          }
        ]),
        [
          {
            text: 'Open all / pay for tests',
            url: webUrl(withTelegramSource('/assessments', session, { action: 'paid_tests' }))
          }
        ],
        ...menuCancelRows()
      ]
    }
  });
}

async function startAssessment(
  kind: TelegramBotKind,
  session: TelegramSession,
  assessmentId: string
) {
  if (!(await requireLinked(kind, session))) return;

  const definition = await getAssessmentDefinition(assessmentId);
  if (!definition) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'This assessment is not available right now.',
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return;
  }

  try {
    await assertAssessmentAccess(definition, session.linkedUserId!);
  } catch (error) {
    const access = await getAssessmentAccessStatus(definition, session.linkedUserId);
    const amountLabel = rupees(access.priceInPaise);
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: [
        `<b>${escapeHtml(definition.title)}</b>`,
        error instanceof Error ? escapeHtml(error.message) : 'This assessment is locked.',
        access.reason === 'PAYMENT_REQUIRED' && amountLabel
          ? `Price: ${escapeHtml(amountLabel)}`
          : '',
        definition.couponLabel ? `Coupon available: ${escapeHtml(definition.couponLabel)}` : '',
        definition.accessNote ? escapeHtml(definition.accessNote) : '',
        '',
        'Payment opens on the Hope Hub website through secure Razorpay checkout. After payment, come back and tap this test again.'
      ]
        .filter(Boolean)
        .join('\n'),
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: amountLabel ? `Pay ${amountLabel} & unlock` : 'Pay & unlock',
              url: assessmentPaymentUrl(definition, session)
            }
          ],
          [
            { text: 'Open assessment page', url: assessmentPaymentUrl(definition, session) },
            { text: 'Payment help', url: webUrl('/payment-policy') }
          ],
          ...menuCancelRows()
        ]
      }
    });
    return;
  }

  const updated = await updateSession(session, {
    state: 'ASSESSMENT_IN_PROGRESS',
    metadata: {
      ...metadataOf(session),
      pendingAssessment: { assessmentId: definition.id, answers: [] }
    } as Prisma.InputJsonValue,
    lastCommand: '/assessments'
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      `<b>${escapeHtml(definition.title)}</b>`,
      escapeHtml(definition.config.instructions),
      definition.config.timeframe ? `Timeframe: ${escapeHtml(definition.config.timeframe)}` : '',
      '',
      'Tap an answer for each question.'
    ]
      .filter(Boolean)
      .join('\n'),
    parse_mode: 'HTML'
  });
  await showAssessmentQuestion(kind, updated);
}

async function showAssessmentQuestion(kind: TelegramBotKind, session: TelegramSession) {
  const pending = metadataOf(session).pendingAssessment;
  if (!pending) {
    await listAssessments(kind, session);
    return;
  }

  const definition = await getAssessmentDefinition(pending.assessmentId);
  if (!definition) {
    await cancelPending(kind, session);
    return;
  }

  const questionIndex = pending.answers.length;
  const question = definition.config.questions[questionIndex];
  if (!question) {
    await completeAssessment(kind, session);
    return;
  }

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      `<b>${escapeHtml(definition.title)}</b>`,
      `Question ${questionIndex + 1}/${definition.config.questions.length}`,
      '',
      escapeHtml(question.text)
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...answerButtonRows(definition),
        ...assessmentNavRows(questionIndex),
        ...menuCancelRows()
      ]
    }
  });
}

async function goBackAssessment(kind: TelegramBotKind, session: TelegramSession) {
  const metadata = metadataOf(session);
  const pending = metadata.pendingAssessment;
  if (!pending) {
    await listAssessments(kind, session);
    return;
  }

  if (!pending.answers.length) {
    await showAssessmentQuestion(kind, session);
    return;
  }

  const updated = await updateSession(session, {
    state: 'ASSESSMENT_IN_PROGRESS',
    metadata: {
      ...metadata,
      pendingAssessment: {
        assessmentId: pending.assessmentId,
        answers: pending.answers.slice(0, -1)
      }
    } as Prisma.InputJsonValue
  });

  await showAssessmentQuestion(kind, updated);
}

async function pauseAssessment(kind: TelegramBotKind, session: TelegramSession) {
  const metadata = metadataOf(session);
  const pending = metadata.pendingAssessment;
  if (!pending) {
    await listAssessments(kind, session);
    return;
  }

  const updated = await updateSession(session, {
    state: 'ASSESSMENT_PAUSED',
    metadata: {
      ...metadata,
      pendingAssessment: pending
    } as Prisma.InputJsonValue
  });

  const definition = await getAssessmentDefinition(pending.assessmentId);
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      'Assessment paused.',
      definition
        ? `${pending.answers.length}/${definition.config.questions.length} questions saved for ${definition.title}.`
        : `${pending.answers.length} answers saved.`
    ].join('\n'),
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Continue', callback_data: 'assessment:resume' },
          { text: 'Retake', callback_data: `assessment:start:${pending.assessmentId}` }
        ],
        [{ text: 'Main menu', callback_data: 'common:menu' }],
        [{ text: 'Cancel assessment', callback_data: 'common:cancel' }]
      ]
    }
  });

  await logEvent({
    kind,
    sessionId: updated.id,
    chatId: updated.chatId,
    eventType: 'assessment_paused',
    payload: { assessmentId: pending.assessmentId, answered: pending.answers.length }
  });
}

async function resumeAssessment(kind: TelegramBotKind, session: TelegramSession) {
  const pending = metadataOf(session).pendingAssessment;
  if (!pending) {
    await listAssessments(kind, session);
    return;
  }

  const updated = await updateSession(session, {
    state: 'ASSESSMENT_IN_PROGRESS',
    lastCommand: '/assessments'
  });
  await showAssessmentQuestion(kind, updated);
}

async function recordAssessmentAnswer(
  kind: TelegramBotKind,
  session: TelegramSession,
  answerValue: number
) {
  const metadata = metadataOf(session);
  const pending = metadata.pendingAssessment;
  if (!pending) {
    await listAssessments(kind, session);
    return;
  }

  const definition = await getAssessmentDefinition(pending.assessmentId);
  if (!definition) {
    await cancelPending(kind, session);
    return;
  }

  const allowed = new Set(definition.config.responseOptions.map((option) => option.value));
  if (!allowed.has(answerValue)) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'That answer option is not valid for this test.',
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return;
  }

  const answers = [...pending.answers, answerValue];
  const updated = await updateSession(session, {
    state: 'ASSESSMENT_IN_PROGRESS',
    metadata: {
      ...metadata,
      pendingAssessment: { assessmentId: pending.assessmentId, answers }
    } as Prisma.InputJsonValue
  });

  if (answers.length >= definition.config.questions.length) {
    await completeAssessment(kind, updated);
    return;
  }
  await showAssessmentQuestion(kind, updated);
}

async function completeAssessment(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const metadata = metadataOf(session);
  const pending = metadata.pendingAssessment;
  if (!pending) {
    await listAssessments(kind, session);
    return;
  }

  const definition = await getAssessmentDefinition(pending.assessmentId);
  if (!definition) {
    await cancelPending(kind, session);
    return;
  }

  let scored;
  try {
    await assertAssessmentAccess(definition, session.linkedUserId!);
    scored = scoreAssessment(definition, pending.answers);
  } catch (error) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: error instanceof Error ? error.message : 'Could not score this assessment.',
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return;
  }

  const previous = await prisma.hopeHubAssessmentAttempt.findFirst({
    where: {
      userId: session.linkedUserId!,
      assessmentId: scored.assessmentId
    },
    orderBy: { completedAt: 'desc' },
    select: { id: true, retakeNumber: true, totalScore: true, level: true, completedAt: true }
  });

  const attempt = await prisma.hopeHubAssessmentAttempt.create({
    data: {
      userId: session.linkedUserId!,
      assessmentId: scored.assessmentId,
      assessmentType: scored.assessmentType,
      category: scored.category || null,
      title: scored.title,
      version: scored.version,
      answers: scored.answers,
      totalScore: scored.total,
      maxScore: scored.maxScore,
      level: scored.level,
      color: scored.color || null,
      description: scored.description || null,
      suggestions: scored.suggestions,
      safetyFlag: scored.safetyFlag,
      retakeNumber: (previous?.retakeNumber ?? 0) + 1,
      previousId: previous?.id ?? null,
      source: 'TELEGRAM_BOT',
      entryPage: `telegram:${botSlugByKind[session.botKind]}`,
      completedAt: new Date()
    }
  });

  if (scored.safetyFlag) {
    await notifyAdminsAboutSafetyFlag(session, attempt);
  }

  const nextMetadata: SessionMetadata = { ...metadata };
  delete nextMetadata.pendingAssessment;
  await updateSession(session, {
    state: 'ACTIVE',
    metadata: nextMetadata as Prisma.InputJsonValue,
    lastCommand: '/assessments'
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      `<b>${escapeHtml(scored.title)} completed</b>`,
      `Score: ${scored.total}/${scored.maxScore}`,
      `Level: ${escapeHtml(scored.level)}`,
      '',
      escapeHtml(scored.description),
      scored.safetyFlag
        ? '\nSafety note: Your answer suggests possible self-harm or urgent risk. Please contact local emergency support now if you may be in danger.'
        : '',
      scored.suggestions.length
        ? `\nSuggestions:\n${scored.suggestions
            .slice(0, 3)
            .map((item) => `• ${escapeHtml(item)}`)
            .join('\n')}`
        : '',
      `\nSaved to profile. Result ID: ${escapeHtml(attempt.id.slice(-8))}`
    ]
      .filter(Boolean)
      .join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Take another test', callback_data: 'user:assessments' },
          { text: 'Create plan', callback_data: `assessment:plan:${attempt.id}` }
        ],
        [{ text: 'Retake same test', callback_data: `assessment:start:${scored.assessmentId}` }],
        [{ text: 'My results', callback_data: 'user:results' }],
        [{ text: 'Open full results', url: webUrl('/profile') }],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
}

async function showAssessmentResults(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;

  const attempts = await prisma.hopeHubAssessmentAttempt.findMany({
    where: { userId: session.linkedUserId! },
    orderBy: { completedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      assessmentId: true,
      title: true,
      totalScore: true,
      maxScore: true,
      level: true,
      safetyFlag: true,
      completedAt: true
    }
  });

  if (!attempts.length) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'No assessment results yet. Tap below to take your first test.',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Take assessment', callback_data: 'user:assessments' }],
          [{ text: 'Main menu', callback_data: 'common:menu' }]
        ]
      }
    });
    return;
  }

  const rows = attempts
    .map(
      (attempt, index) =>
        `${index + 1}. <b>${escapeHtml(attempt.title)}</b>\nScore: ${attempt.totalScore}/${attempt.maxScore} | Level: ${escapeHtml(attempt.level)}${attempt.safetyFlag ? ' | Safety flag' : ''}\nDate: ${attempt.completedAt.toISOString().slice(0, 10)}`
    )
    .join('\n\n');

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `<b>Your latest assessment results</b>\n\n${rows}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...attempts.slice(0, 3).flatMap((attempt) => [
          [
            {
              text: `Create plan: ${attempt.title.slice(0, 22)}`,
              callback_data: `assessment:plan:${attempt.id}`
            }
          ],
          [
            {
              text: `Retake: ${attempt.title.slice(0, 28)}`,
              callback_data: `assessment:start:${attempt.assessmentId}`
            }
          ]
        ]),
        [
          { text: 'Take another test', callback_data: 'user:assessments' },
          { text: 'Open profile', url: webUrl('/profile') }
        ],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
}

async function showUserRequests(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;

  const leads = await prisma.websiteLead.findMany({
    where: { userId: session.linkedUserId! },
    include: {
      assignments: {
        orderBy: { assignedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          assignmentType: true,
          status: true,
          assignedAt: true,
          provider: { select: { name: true } }
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 8
  });

  if (!leads.length) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'No support, booking, or emotional support listener requests yet.',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Get support', callback_data: 'user:support' },
            { text: 'Book session', callback_data: 'user:book' }
          ],
          [{ text: 'Main menu', callback_data: 'common:menu' }]
        ]
      }
    });
    return;
  }

  const rows = leads
    .map((lead, index) => {
      const assignment = lead.assignments[0];
      return [
        `${index + 1}. <b>${escapeHtml(lead.concern || 'Request')}</b>`,
        `Status: ${lead.followUpStatus}`,
        assignment
          ? `Assigned: ${escapeHtml(assignment.provider?.name || assignment.assignmentType)} · ${assignment.status}`
          : 'Assigned: Not yet',
        lead.preferredCallbackTime
          ? `Preferred time: ${escapeHtml(lead.preferredCallbackTime)}`
          : '',
        `Lead: ${escapeHtml(lead.id.slice(-8))}`
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `<b>Your Hope Hub requests</b>\n\n${rows}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Get support', callback_data: 'user:support' },
          { text: 'Book session', callback_data: 'user:book' }
        ],
        [{ text: 'Open profile', url: webUrl('/profile') }],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
}

async function createPlanFromAssessment(
  kind: TelegramBotKind,
  session: TelegramSession,
  attemptId: string
) {
  if (!(await requireLinked(kind, session))) return;

  const attempt = await prisma.hopeHubAssessmentAttempt.findFirst({
    where: { id: attemptId, userId: session.linkedUserId! },
    select: {
      id: true,
      title: true,
      level: true,
      totalScore: true,
      maxScore: true,
      suggestions: true,
      safetyFlag: true
    }
  });

  if (!attempt) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Assessment result not found.',
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return;
  }

  const plan = await ensureTodayPlan(session.linkedUserId!);
  const suggestions = Array.isArray(attempt.suggestions)
    ? attempt.suggestions.filter((item): item is string => typeof item === 'string')
    : [];
  const taskTitles = [
    `Review ${attempt.title} result: ${attempt.level}`,
    suggestions[0] || 'Do one grounding or breathing practice',
    suggestions[1] || 'Take one small supportive action',
    attempt.safetyFlag ? 'Reach out to a trusted person or emergency support if unsafe' : ''
  ]
    .filter(Boolean)
    .slice(0, 4);

  const existingTasks = await prisma.patientDailyPlanTask.findMany({
    where: { planId: plan.id },
    select: { title: true }
  });
  const existingTitles = new Set(existingTasks.map((task) => task.title.toLowerCase()));
  const createTasks = taskTitles
    .filter((title) => !existingTitles.has(title.toLowerCase()))
    .map((title, index) => ({
      planId: plan.id,
      title,
      sortOrder: plan.tasks.length + index
    }));

  if (createTasks.length) {
    await prisma.patientDailyPlanTask.createMany({ data: createTasks });
  }

  await prisma.patientDailyPlan.update({
    where: { id: plan.id },
    data: {
      focus: `Support after ${attempt.title}: ${attempt.level}`,
      reviewNote: plan.reviewNote || `Plan created from ${attempt.title} result.`
    }
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `Daily plan updated from your ${escapeHtml(attempt.title)} result.`,
    parse_mode: 'HTML'
  });
  await showUserPlan(kind, session);
}

async function notifyAdminsAboutSafetyFlag(
  session: TelegramSession,
  attempt: {
    id: string;
    title: string;
    totalScore: number;
    maxScore: number;
    level: string;
    userId: string;
  }
) {
  const adminSessions = await prisma.telegramBotSession.findMany({
    where: {
      botKind: TelegramBotKind.ADMIN,
      linkedUser: { role: 'ADMIN', isActive: true }
    },
    select: { chatId: true }
  });

  const userLine = session.linkedUser
    ? `${session.linkedUser.name} (${session.linkedUser.email || 'no email'})`
    : `User ${attempt.userId}`;

  await Promise.allSettled(
    adminSessions.map((adminSession) =>
      sendTelegramMessage(TelegramBotKind.ADMIN, {
        chat_id: adminSession.chatId,
        text: [
          '<b>Safety flag from assessment</b>',
          `User: ${escapeHtml(userLine)}`,
          `Assessment: ${escapeHtml(attempt.title)}`,
          `Score: ${attempt.totalScore}/${attempt.maxScore}`,
          `Level: ${escapeHtml(attempt.level)}`,
          `Attempt: ${escapeHtml(attempt.id.slice(-8))}`,
          '',
          'Please review in admin panel and follow the safety protocol.'
        ].join('\n'),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Mark reviewed', callback_data: `admin:safety_reviewed:${attempt.id}` },
              { text: 'Open admin', url: adminUrl('/') }
            ]
          ]
        }
      })
    )
  );
}

async function notifyAdminsAboutSafetySupportLead(
  session: TelegramSession,
  lead: { id: string },
  details: { concern: string; preferredCallbackTime?: string | null }
) {
  const adminSessions = await prisma.telegramBotSession.findMany({
    where: {
      botKind: TelegramBotKind.ADMIN,
      linkedUser: { role: 'ADMIN', isActive: true }
    },
    select: { chatId: true }
  });

  const userLine = session.linkedUser
    ? `${session.linkedUser.name} (${session.linkedUser.email || 'no email'})`
    : telegramDisplayName(session);
  const providers = await listAssignableLeadProviders({ safety: true });
  const assignmentRows = leadAssignmentRows(lead.id, providers);

  await Promise.allSettled(
    adminSessions.map((adminSession) =>
      sendTelegramMessage(TelegramBotKind.ADMIN, {
        chat_id: adminSession.chatId,
        text: [
          '<b>Safety support request</b>',
          `User: ${escapeHtml(userLine)}`,
          `Telegram: ${escapeHtml(session.username ? `@${session.username}` : session.chatId)}`,
          `Lead: ${escapeHtml(lead.id.slice(-8))}`,
          `Concern: ${escapeHtml(details.concern)}`,
          details.preferredCallbackTime
            ? `Preferred time: ${escapeHtml(details.preferredCallbackTime)}`
            : '',
          '',
          'Follow safety protocol. Do not assign listener-only handling for crisis risk.'
        ]
          .filter(Boolean)
          .join('\n'),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...assignmentRows,
            [{ text: 'Mark follow-up', callback_data: `lead:followup:${lead.id}` }],
            [{ text: 'Open lead', url: leadAdminUrl(lead.id) }]
          ]
        }
      })
    )
  );
}

function leadAdminUrl(leadId: string) {
  return adminUrl(`/chat-inbox?leadId=${encodeURIComponent(leadId)}`);
}

type AssignableLeadProvider = Awaited<ReturnType<typeof listAssignableLeadProviders>>[number];

function leadAssignmentRows(leadId: string, providers: AssignableLeadProvider[]): InlineButton[][] {
  const providerRows = callbackRows(
    providers.slice(0, 6).map((provider) => ({
      text:
        provider.assignmentType === 'PSYCHOLOGIST'
          ? `Assign ${provider.name} (Psychologist)`
          : `Assign ${provider.name}`,
      callback_data: `lead:assign:${provider.providerId}:${leadId}`
    })),
    2
  );
  return providerRows;
}

async function notifyAdminsAboutTelegramLead(
  session: TelegramSession,
  lead: { id: string },
  details: {
    kind: 'BOOKING' | 'SUPPORT' | 'VOLUNTEER';
    concern: string;
    preferredCallbackTime?: string | null;
    safety: boolean;
  }
) {
  if (details.safety) {
    await notifyAdminsAboutSafetySupportLead(session, lead, {
      concern: details.concern,
      preferredCallbackTime: details.preferredCallbackTime
    });
    return;
  }

  const adminSessions = await prisma.telegramBotSession.findMany({
    where: {
      botKind: TelegramBotKind.ADMIN,
      linkedUser: { role: 'ADMIN', isActive: true }
    },
    select: { chatId: true }
  });

  if (!adminSessions.length) return;

  const userLine = session.linkedUser
    ? `${session.linkedUser.name} (${session.linkedUser.email || 'no email'})`
    : telegramDisplayName(session);
  const kindLabel =
    details.kind === 'BOOKING'
      ? 'Booking request'
      : details.kind === 'SUPPORT'
        ? 'Support request'
        : 'Emotional support request';
  const providers = await listAssignableLeadProviders({ safety: details.safety });
  const assignmentRows = leadAssignmentRows(lead.id, providers);

  await Promise.allSettled(
    adminSessions.map((adminSession) =>
      sendTelegramMessage(TelegramBotKind.ADMIN, {
        chat_id: adminSession.chatId,
        text: [
          `<b>New Telegram ${kindLabel}</b>`,
          `User: ${escapeHtml(userLine)}`,
          `Telegram: ${escapeHtml(session.username ? `@${session.username}` : session.chatId)}`,
          `Lead: ${escapeHtml(lead.id.slice(-8))}`,
          `Concern: ${escapeHtml(details.concern)}`,
          details.preferredCallbackTime
            ? `Preferred time: ${escapeHtml(details.preferredCallbackTime)}`
            : '',
          '',
          'Choose a quick handoff or open admin for full review.'
        ]
          .filter(Boolean)
          .join('\n'),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...assignmentRows,
            [{ text: 'Mark follow-up', callback_data: `lead:followup:${lead.id}` }],
            [{ text: 'Open lead', url: leadAdminUrl(lead.id) }]
          ]
        }
      })
    )
  );
}

async function setLeadAssignmentIntent(
  kind: TelegramBotKind,
  session: TelegramSession,
  leadId: string,
  providerId: string
) {
  if (kind !== TelegramBotKind.ADMIN || !(await requireLinked(kind, session))) return;
  try {
    const result = await assignWebsiteLead({
      leadId,
      providerId,
      assignedById: session.linkedUserId!,
      assignedByName: session.linkedUser?.name
    });

    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: [
        `Assignment created for lead ${leadId.slice(-8)}.`,
        `Provider: ${escapeHtml(result.provider.name)}${
          result.provider.email ? ` (${escapeHtml(result.provider.email)})` : ''
        }`
      ].join('\n'),
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: 'Open lead', url: leadAdminUrl(leadId) }]]
      }
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'LEAD_NOT_FOUND'
        ? 'Lead not found. It may have been deleted or merged.'
        : error instanceof Error && error.message === 'PROVIDER_NOT_FOUND'
          ? 'Provider not found or inactive. Refresh the lead and try another provider.'
          : error instanceof Error && error.message === 'SAFETY_LEAD_REQUIRES_PSYCHOLOGIST'
            ? 'Safety leads can only be assigned to psychologist/admin escalation. Listener assignment is blocked.'
            : 'Could not assign this lead right now.';
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: message,
      reply_markup: {
        inline_keyboard: [[{ text: 'Open lead', url: leadAdminUrl(leadId) }]]
      }
    });
  }
}

async function markTelegramLeadFollowUp(
  kind: TelegramBotKind,
  session: TelegramSession,
  leadId: string
) {
  if (kind !== TelegramBotKind.ADMIN || !(await requireLinked(kind, session))) return;
  const lead = await prisma.websiteLead.findUnique({
    where: { id: leadId },
    select: { id: true, operatorNote: true }
  });
  if (!lead) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Lead not found. It may have been deleted or merged.'
    });
    return;
  }

  const note = `[Telegram admin] Follow-up acknowledged by ${session.linkedUser?.name || 'admin'} at ${new Date().toISOString()}`;
  await prisma.websiteLead.update({
    where: { id: leadId },
    data: {
      followUpStatus: 'NEEDS_CALLBACK',
      operatorNote: [note, lead.operatorNote].filter(Boolean).join('\n')
    }
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `Marked follow-up needed for lead ${leadId.slice(-8)}.`,
    reply_markup: {
      inline_keyboard: [[{ text: 'Open lead', url: leadAdminUrl(leadId) }]]
    }
  });
}

type ProviderApplicationTrack =
  'PROFESSIONAL_PSYCHOLOGIST' | 'PSYCHOLOGY_STUDENT_VOLUNTEER' | 'PEER_SUPPORT_VOLUNTEER';

const providerTrackLabels: Record<ProviderApplicationTrack, string> = {
  PROFESSIONAL_PSYCHOLOGIST: 'Professional psychologist',
  PSYCHOLOGY_STUDENT_VOLUNTEER: 'Psychology student emotional support listener',
  PEER_SUPPORT_VOLUNTEER: 'Peer emotional support listener'
};

const careTeamTypeOptions: Array<{
  type: CareTeamMemberType;
  track: ProviderApplicationTrack;
  label: string;
}> = [
  {
    type: CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL,
    track: 'PROFESSIONAL_PSYCHOLOGIST',
    label: 'Mental wellness professional'
  },
  {
    type: CareTeamMemberType.QUALIFIED_COUNSELLOR,
    track: 'PROFESSIONAL_PSYCHOLOGIST',
    label: 'Qualified counsellor'
  },
  {
    type: CareTeamMemberType.PSYCHOLOGY_STUDENT_VOLUNTEER,
    track: 'PSYCHOLOGY_STUDENT_VOLUNTEER',
    label: 'Psychology student emotional support listener'
  },
  {
    type: CareTeamMemberType.PEER_SUPPORT_VOLUNTEER,
    track: 'PEER_SUPPORT_VOLUNTEER',
    label: 'Peer emotional support listener'
  },
  { type: CareTeamMemberType.NLP_COACH, track: 'PROFESSIONAL_PSYCHOLOGIST', label: 'NLP coach' },
  { type: CareTeamMemberType.LIFE_COACH, track: 'PROFESSIONAL_PSYCHOLOGIST', label: 'Life coach' },
  {
    type: CareTeamMemberType.MEDITATION_BREATHWORK_GUIDE,
    track: 'PROFESSIONAL_PSYCHOLOGIST',
    label: 'Meditation / breathwork guide'
  },
  {
    type: CareTeamMemberType.CAREER_STUDY_MENTOR,
    track: 'PROFESSIONAL_PSYCHOLOGIST',
    label: 'Career / study mentor'
  }
];

const careTeamTypeLabels = Object.fromEntries(
  careTeamTypeOptions.map((option) => [option.type, option.label])
) as Record<CareTeamMemberType, string>;

function providerApplicationOf(session: TelegramSession) {
  return metadataOf(session).pendingProviderApplication ?? {};
}

async function startProviderSignup(kind: TelegramBotKind, session: TelegramSession) {
  if (kind !== TelegramBotKind.DOCTOR) {
    await replyMenu(kind, session, 'Care team signup is available in the care team bot.');
    return;
  }

  await updateSession(session, {
    state: 'WAITING_PROVIDER_APPLICATION_TRACK',
    metadata: {
      ...metadataOf(session),
      pendingProviderApplication: {}
    } as Prisma.InputJsonValue,
    lastCommand: '/signup'
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Apply to work with Hope Hub</b>',
      '',
      'Choose your role. This creates an application for admin review; it does not activate care team access automatically.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...callbackRows(
          careTeamTypeOptions.map((option) => ({
            text: option.label,
            callback_data: `provider_signup:type:${option.type}`
          })),
          1
        ),
        ...menuCancelRows()
      ]
    }
  });
}

async function setProviderSignupTrack(
  kind: TelegramBotKind,
  session: TelegramSession,
  track: ProviderApplicationTrack,
  careTeamType: CareTeamMemberType = CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL
) {
  const metadata: SessionMetadata = {
    ...metadataOf(session),
    pendingProviderApplication: { applicationTrack: track, careTeamType }
  };
  await updateSession(session, {
    state: 'WAITING_PROVIDER_APPLICATION_NAME',
    metadata: metadata as Prisma.InputJsonValue,
    lastCommand: '/signup'
  });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [`<b>${careTeamTypeLabels[careTeamType]}</b>`, 'Please send your full name.'].join('\n'),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: menuCancelRows() }
  });
}

function splitLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function handleProviderApplicationText(
  kind: TelegramBotKind,
  session: TelegramSession,
  text: string
) {
  if (kind !== TelegramBotKind.DOCTOR) return false;
  const metadata = metadataOf(session);
  const pending = metadata.pendingProviderApplication;
  if (!pending) return false;

  if (session.state === 'WAITING_PROVIDER_APPLICATION_NAME') {
    const fullName = text.trim().slice(0, 120);
    if (fullName.length < 2) {
      await sendTelegramMessage(kind, {
        chat_id: session.chatId,
        text: 'Please send your full name.',
        reply_markup: { inline_keyboard: menuCancelRows() }
      });
      return true;
    }
    await updateSession(session, {
      state: 'WAITING_PROVIDER_APPLICATION_CONTACT',
      metadata: {
        ...metadata,
        pendingProviderApplication: { ...pending, fullName }
      } as Prisma.InputJsonValue
    });
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: [
        'Send contact details in 3 lines:',
        '',
        'email@example.com',
        '+91 phone number',
        'City'
      ].join('\n'),
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return true;
  }

  if (session.state === 'WAITING_PROVIDER_APPLICATION_CONTACT') {
    const [email = '', phone = '', city = ''] = splitLines(text);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 5 || city.length < 2) {
      await sendTelegramMessage(kind, {
        chat_id: session.chatId,
        text: 'Please send valid email, phone, and city in 3 separate lines.',
        reply_markup: { inline_keyboard: menuCancelRows() }
      });
      return true;
    }
    await updateSession(session, {
      state: 'WAITING_PROVIDER_APPLICATION_QUALIFICATION',
      metadata: {
        ...metadata,
        pendingProviderApplication: {
          ...pending,
          email: email.toLowerCase(),
          phone: phone.slice(0, 30),
          city: city.slice(0, 120)
        }
      } as Prisma.InputJsonValue
    });
    const track = pending.applicationTrack;
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text:
        track === 'PROFESSIONAL_PSYCHOLOGIST'
          ? [
              'Send professional details in 4 lines:',
              '',
              'Qualification',
              'Qualified from / institute',
              'Specialization',
              'Experience years',
              'Registration/license details, if any'
            ].join('\n')
          : track === 'PSYCHOLOGY_STUDENT_VOLUNTEER'
            ? [
                'Send student listener details in 3 lines:',
                '',
                'Current course/qualification',
                'Area of interest',
                'Supervisor/faculty details'
              ].join('\n')
            : [
                'Briefly share your peer-support or life-experience background.',
                '',
                'Do not include private medical details. Keep it safe and general.'
              ].join('\n'),
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return true;
  }

  if (session.state === 'WAITING_PROVIDER_APPLICATION_QUALIFICATION') {
    const lines = splitLines(text);
    const track = pending.applicationTrack;
    const next =
      track === 'PROFESSIONAL_PSYCHOLOGIST'
        ? {
            qualification: lines[0] || '',
            qualifiedFrom: lines[1] || '',
            specialization: lines[2] || '',
            experienceYears: lines[3] || '',
            registrationDetails: lines.slice(4).join(' ') || ''
          }
        : track === 'PSYCHOLOGY_STUDENT_VOLUNTEER'
          ? {
              qualification: lines[0] || '',
              specialization: lines[1] || '',
              registrationDetails: lines.slice(2).join(' ') || '',
              experienceYears: 'Student listener'
            }
          : {
              qualification: 'Peer support experience',
              specialization: 'Non-clinical peer support',
              experienceYears: 'Life experience',
              registrationDetails: '',
              livedExperienceSummary: text.trim().slice(0, 3000)
            };
    const requiredValues =
      track === 'PROFESSIONAL_PSYCHOLOGIST'
        ? [next.qualification, next.specialization, next.experienceYears, next.registrationDetails]
        : track === 'PSYCHOLOGY_STUDENT_VOLUNTEER'
          ? [next.qualification, next.specialization, next.registrationDetails]
          : [next.livedExperienceSummary];
    if (requiredValues.some((value) => typeof value === 'string' && !value.trim())) {
      await sendTelegramMessage(kind, {
        chat_id: session.chatId,
        text: 'Please complete the requested details. Use separate lines as shown.',
        reply_markup: { inline_keyboard: menuCancelRows() }
      });
      return true;
    }
    await updateSession(session, {
      state: 'WAITING_PROVIDER_APPLICATION_AVAILABILITY',
      metadata: {
        ...metadata,
        pendingProviderApplication: { ...pending, ...next }
      } as Prisma.InputJsonValue
    });
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: [
        'Send availability details in 3 lines:',
        '',
        'Languages you can support',
        'Availability, e.g. evenings/weekends',
        'Preferred contact: email / phone / whatsapp / telegram'
      ].join('\n'),
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return true;
  }

  if (session.state === 'WAITING_PROVIDER_APPLICATION_AVAILABILITY') {
    const [languages = '', availability = '', preferred = 'telegram'] = splitLines(text);
    const preferredChannel = ['email', 'phone', 'whatsapp', 'telegram'].includes(
      preferred.toLowerCase()
    )
      ? (preferred.toLowerCase() as 'email' | 'phone' | 'whatsapp' | 'telegram')
      : 'telegram';
    if (languages.length < 2 || availability.length < 2) {
      await sendTelegramMessage(kind, {
        chat_id: session.chatId,
        text: 'Please send languages, availability, and preferred contact in 3 lines.',
        reply_markup: { inline_keyboard: menuCancelRows() }
      });
      return true;
    }
    await updateSession(session, {
      state: 'WAITING_PROVIDER_APPLICATION_WHY',
      metadata: {
        ...metadata,
        pendingProviderApplication: {
          ...pending,
          languages: languages.slice(0, 180),
          availability: availability.slice(0, 180),
          preferredChannel
        }
      } as Prisma.InputJsonValue
    });
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: [
        'Last step: tell us why you want to work with Hope Hub.',
        '',
        'Please write at least 40 characters. Also confirm you understand listeners/student supporters are non-clinical and must follow safety escalation.'
      ].join('\n'),
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return true;
  }

  if (session.state === 'WAITING_PROVIDER_APPLICATION_WHY') {
    const whyJoin = text.trim().slice(0, 3000);
    if (whyJoin.length < 40) {
      await sendTelegramMessage(kind, {
        chat_id: session.chatId,
        text: 'Please share a little more — at least 40 characters.',
        reply_markup: { inline_keyboard: menuCancelRows() }
      });
      return true;
    }
    await finishProviderApplication(kind, session, whyJoin);
    return true;
  }

  return false;
}

async function finishProviderApplication(
  kind: TelegramBotKind,
  session: TelegramSession,
  whyJoin: string
) {
  const metadata = metadataOf(session);
  const pending = metadata.pendingProviderApplication;
  if (!pending?.applicationTrack) {
    await startProviderSignup(kind, session);
    return;
  }

  const application = await prisma.counsellorApplication.create({
    data: {
      applicationTrack: pending.applicationTrack,
      careTeamType: pending.careTeamType || CareTeamMemberType.MENTAL_WELLNESS_PROFESSIONAL,
      fullName: pending.fullName || telegramDisplayName(session),
      email: pending.email || `${session.chatId}@telegram.local`,
      phone: pending.phone || session.chatId,
      city: pending.city || 'Not provided',
      qualification: pending.qualification || null,
      qualifiedFrom: pending.qualifiedFrom || null,
      specialization: pending.specialization || null,
      experienceYears: pending.experienceYears || null,
      registrationDetails:
        pending.applicationTrack === 'PSYCHOLOGY_STUDENT_VOLUNTEER'
          ? null
          : pending.registrationDetails || null,
      languages: pending.languages || 'Not provided',
      availability: pending.availability || 'Not provided',
      preferredChannel: pending.preferredChannel || 'telegram',
      supervisionDetails:
        pending.applicationTrack === 'PSYCHOLOGY_STUDENT_VOLUNTEER'
          ? pending.registrationDetails || null
          : null,
      livedExperienceSummary:
        pending.applicationTrack === 'PEER_SUPPORT_VOLUNTEER'
          ? pending.livedExperienceSummary || whyJoin
          : null,
      agreesToNonClinicalRole: pending.applicationTrack !== 'PROFESSIONAL_PSYCHOLOGIST',
      whyJoin,
      source: 'telegram-provider-bot',
      entryPage: `telegram:${session.botKind}:${session.chatId}`
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      applicationTrack: true,
      careTeamType: true
    }
  });

  const nextMetadata: SessionMetadata = { ...metadata };
  delete nextMetadata.pendingProviderApplication;
  await updateSession(session, {
    state: 'ACTIVE',
    metadata: nextMetadata as Prisma.InputJsonValue,
    lastCommand: '/signup'
  });
  await notifyAdminsAboutProviderApplication(application);

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Application received</b>',
      `ID: ${escapeHtml(application.id.slice(-8))}`,
      `Role: ${escapeHtml(careTeamTypeLabels[application.careTeamType])}`,
      '',
      'Admin will review it. If approved, your care team account/access will be created or linked after onboarding.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Open website careers', url: volunteerApplicationUrl(session) }],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
}

async function showProviderAssignments(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const assignments = await prisma.websiteLeadAssignment.findMany({
    where: {
      providerId: session.linkedUserId!,
      status: { in: ['PENDING', 'ACCEPTED', 'CONTACTED'] }
    },
    include: {
      lead: {
        select: {
          id: true,
          visitorName: true,
          visitorEmail: true,
          visitorPhone: true,
          concern: true,
          preferredCallbackTime: true,
          createdAt: true
        }
      }
    },
    orderBy: [{ assignedAt: 'desc' }],
    take: 8
  });

  if (!assignments.length) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'No active support lead assignments right now.',
      reply_markup: { inline_keyboard: [[{ text: 'Main menu', callback_data: 'common:menu' }]] }
    });
    return;
  }

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Your support assignments</b>',
      '',
      ...assignments.map(
        (assignment, index) =>
          `${index + 1}. <b>${escapeHtml(assignment.lead.visitorName || 'Visitor')}</b> · ${assignment.status}\n${escapeHtml(assignment.lead.concern || 'No concern added')}\nLead: ${escapeHtml(assignment.lead.id.slice(-8))}`
      )
    ].join('\n\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: assignments.flatMap((assignment) => [
        [
          {
            text: `Accept ${assignment.lead.id.slice(-4)}`,
            callback_data: `provider:assign:accept:${assignment.id}`
          },
          {
            text: `Decline ${assignment.lead.id.slice(-4)}`,
            callback_data: `provider:assign:decline:${assignment.id}`
          }
        ],
        [
          {
            text: `Contacted ${assignment.lead.id.slice(-4)}`,
            callback_data: `provider:assign:contacted:${assignment.id}`
          },
          {
            text: `Complete ${assignment.lead.id.slice(-4)}`,
            callback_data: `provider:assign:complete:${assignment.id}`
          }
        ]
      ])
    }
  });
}

async function notifyUserAboutAssignmentStatus(input: {
  lead: {
    id: string;
    userId: string | null;
    concern: string | null;
  };
  providerName: string;
  status: 'ACCEPTED' | 'CONTACTED' | 'COMPLETED';
}) {
  if (!input.lead.userId) return;
  const userSessions = await prisma.telegramBotSession.findMany({
    where: {
      botKind: TelegramBotKind.USER,
      linkedUserId: input.lead.userId,
      linkedUser: { isActive: true, role: 'PATIENT' }
    },
    select: { chatId: true }
  });
  if (!userSessions.length) return;

  const statusLine =
    input.status === 'ACCEPTED'
      ? `${input.providerName} accepted your support request.`
      : input.status === 'CONTACTED'
        ? `${input.providerName} marked your support request as contacted.`
        : `${input.providerName} marked your support request as completed.`;

  await Promise.allSettled(
    userSessions.map((userSession) =>
      sendTelegramMessage(TelegramBotKind.USER, {
        chat_id: userSession.chatId,
        text: [
          '<b>Request update</b>',
          escapeHtml(statusLine),
          `Request: ${escapeHtml(input.lead.concern || input.lead.id.slice(-8))}`,
          '',
          input.status === 'COMPLETED'
            ? 'If you still need help, you can create a new support request.'
            : 'You can check your request status anytime from My requests.'
        ].join('\n'),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'My requests', callback_data: 'user:requests' }],
            [
              { text: 'Get support', callback_data: 'user:support' },
              { text: 'Open profile', url: webUrl('/profile') }
            ]
          ]
        }
      })
    )
  );
}

async function notifyAdminsAboutAssignmentStatus(input: {
  assignmentId: string;
  lead: {
    id: string;
    visitorName: string | null;
    concern: string | null;
  };
  providerName: string;
  status: 'ACCEPTED' | 'DECLINED' | 'CONTACTED' | 'COMPLETED';
}) {
  const adminSessions = await prisma.telegramBotSession.findMany({
    where: {
      botKind: TelegramBotKind.ADMIN,
      linkedUser: { role: 'ADMIN', isActive: true }
    },
    select: { chatId: true }
  });
  if (!adminSessions.length) return;

  const isDeclined = input.status === 'DECLINED';
  const reassignmentRows = isDeclined
    ? leadAssignmentRows(
        input.lead.id,
        await listAssignableLeadProviders({ safety: isSafetyLead(input.lead.concern) })
      )
    : [];
  await Promise.allSettled(
    adminSessions.map((adminSession) =>
      sendTelegramMessage(TelegramBotKind.ADMIN, {
        chat_id: adminSession.chatId,
        text: [
          `<b>Assignment ${input.status.toLowerCase()}</b>`,
          `Provider: ${escapeHtml(input.providerName)}`,
          `User: ${escapeHtml(input.lead.visitorName || 'Visitor')}`,
          `Lead: ${escapeHtml(input.lead.id.slice(-8))}`,
          `Concern: ${escapeHtml(input.lead.concern || 'No concern added')}`,
          isDeclined ? '' : 'Status is synced to admin lead history.'
        ]
          .filter(Boolean)
          .join('\n'),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: isDeclined
            ? [...reassignmentRows, [{ text: 'Open lead', url: leadAdminUrl(input.lead.id) }]]
            : [[{ text: 'Open lead', url: leadAdminUrl(input.lead.id) }]]
        }
      })
    )
  );
}

async function updateProviderAssignmentStatus(
  kind: TelegramBotKind,
  session: TelegramSession,
  assignmentId: string,
  action: 'accept' | 'decline' | 'contacted' | 'complete'
) {
  if (!(await requireLinked(kind, session))) return;
  const now = new Date();
  const statusByAction = {
    accept: 'ACCEPTED',
    decline: 'DECLINED',
    contacted: 'CONTACTED',
    complete: 'COMPLETED'
  } as const;
  const timestampField = {
    accept: 'acceptedAt',
    decline: 'declinedAt',
    contacted: 'contactedAt',
    complete: 'completedAt'
  } as const;

  const assignment = await prisma.websiteLeadAssignment.findFirst({
    where: { id: assignmentId, providerId: session.linkedUserId! },
    include: {
      provider: { select: { name: true } },
      lead: {
        select: {
          id: true,
          userId: true,
          visitorName: true,
          concern: true,
          operatorNote: true
        }
      }
    }
  });
  if (!assignment) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Assignment not found for your provider account.'
    });
    return;
  }

  await prisma.websiteLeadAssignment.update({
    where: { id: assignment.id },
    data: {
      status: statusByAction[action],
      [timestampField[action]]: now
    }
  });
  await prisma.websiteLead.update({
    where: { id: assignment.leadId },
    data: {
      followUpStatus:
        action === 'complete' ? 'CLOSED' : action === 'contacted' ? 'CALLED' : 'NEEDS_CALLBACK',
      calledAt: action === 'contacted' ? now : undefined,
      operatorNote: [
        `[Provider bot] ${session.linkedUser?.name || 'Provider'} marked assignment ${statusByAction[action]} at ${now.toISOString()}`,
        assignment.lead.operatorNote
      ]
        .filter(Boolean)
        .join('\n')
    }
  });

  const providerName = assignment.provider?.name || session.linkedUser?.name || 'Provider';
  await notifyAdminsAboutAssignmentStatus({
    assignmentId: assignment.id,
    lead: assignment.lead,
    providerName,
    status: statusByAction[action]
  });
  if (
    statusByAction[action] === 'ACCEPTED' ||
    statusByAction[action] === 'CONTACTED' ||
    statusByAction[action] === 'COMPLETED'
  ) {
    await notifyUserAboutAssignmentStatus({
      lead: assignment.lead,
      providerName,
      status: statusByAction[action]
    });
  }

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `Assignment ${assignment.leadId.slice(-8)} updated: ${statusByAction[action]}.`,
    reply_markup: {
      inline_keyboard: [[{ text: 'My assignments', callback_data: 'doctor:assignments' }]]
    }
  });
}

async function markSafetyFlagReviewed(
  kind: TelegramBotKind,
  session: TelegramSession,
  attemptId: string
) {
  if (!(await requireLinked(kind, session))) return;

  const attempt = await prisma.hopeHubAssessmentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      title: true,
      level: true,
      safetyFlag: true,
      safetyReviewedAt: true,
      user: { select: { name: true, email: true } }
    }
  });

  if (!attempt) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Assessment attempt not found. It may have been removed.'
    });
    return;
  }

  if (attempt.safetyReviewedAt) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: [
        '<b>Already reviewed</b>',
        `Assessment: ${escapeHtml(attempt.title)}`,
        `Reviewed: ${attempt.safetyReviewedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`
      ].join('\n'),
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: 'Open admin', url: adminUrl('/') }]]
      }
    });
    return;
  }

  const reviewedAt = new Date();
  await prisma.hopeHubAssessmentAttempt.update({
    where: { id: attempt.id },
    data: {
      safetyReviewedAt: reviewedAt,
      safetyReviewedById: session.linkedUserId,
      safetyReviewNote: `Reviewed from Telegram admin bot by ${session.linkedUser?.name || 'admin'}`
    }
  });

  await logEvent({
    kind,
    sessionId: session.id,
    chatId: session.chatId,
    eventType: 'assessment_safety_reviewed',
    payload: {
      attemptId: attempt.id,
      reviewedByUserId: session.linkedUserId,
      safetyFlag: attempt.safetyFlag
    }
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Safety review noted</b>',
      `User: ${escapeHtml(attempt.user.name)} (${escapeHtml(attempt.user.email || 'no email')})`,
      `Assessment: ${escapeHtml(attempt.title)}`,
      `Level: ${escapeHtml(attempt.level)}`,
      `Reviewed: ${reviewedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
      '',
      'Saved on the assessment attempt and in Telegram bot audit events.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Open admin', url: adminUrl('/') }]]
    }
  });
}

async function ensureTodayPlan(userId: string) {
  const planDate = todayStart();
  return prisma.patientDailyPlan.upsert({
    where: { userId_planDate: { userId, planDate } },
    create: {
      userId,
      planDate,
      title: 'Today plan',
      focus: 'Small steady steps',
      tasks: {
        create: [
          { title: 'One grounding practice', sortOrder: 0 },
          { title: 'One practical task', sortOrder: 1 },
          { title: 'One connection or self-care step', sortOrder: 2 }
        ]
      }
    },
    update: {},
    include: {
      tasks: { orderBy: { sortOrder: 'asc' } },
      images: { where: { taskId: null }, orderBy: { createdAt: 'desc' } }
    }
  });
}

async function showUserPlan(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const plan = await ensureTodayPlan(session.linkedUserId!);
  const done = plan.tasks.filter((task) => task.completed).length;
  const taskLines = plan.tasks.length
    ? plan.tasks
        .map(
          (task, index) => `${task.completed ? '✓' : '☐'} ${index + 1}. ${escapeHtml(task.title)}`
        )
        .join('\n')
    : 'No tasks yet.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      `<b>${escapeHtml(plan.title)}</b>`,
      `${done}/${plan.tasks.length} tasks done`,
      '',
      taskLines,
      plan.reviewNote ? `\nReview: ${escapeHtml(plan.reviewNote)}` : ''
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...plan.tasks.slice(0, 8).map((task) => [
          {
            text: `${task.completed ? 'Undo' : 'Done'}: ${task.title.slice(0, 24)}`,
            callback_data: `user:task:${task.id}`
          }
        ]),
        [
          { text: 'Add task', callback_data: 'user:addtask' },
          { text: 'Review day', callback_data: 'user:review' }
        ],
        [{ text: 'Open full profile', url: webUrl('/profile') }]
      ]
    }
  });
}

async function promptAddTask(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  await updateSession(session, { state: 'ACTIVE', lastCommand: '/addtask' });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: 'Choose a task to add, or tap Custom task if you want to type your own.',
    reply_markup: {
      inline_keyboard: [
        ...callbackRows(
          planTaskPresets.map((task) => ({
            text: task.title,
            callback_data: `user:addpreset:${task.key}`
          }))
        ),
        [{ text: 'Custom task', callback_data: 'user:addcustom' }],
        ...menuCancelRows()
      ]
    }
  });
}

async function addTaskTitle(kind: TelegramBotKind, session: TelegramSession, titleText: string) {
  if (!(await requireLinked(kind, session))) return;
  const title = titleText.trim().slice(0, 160);
  if (!title) {
    await sendTelegramMessage(kind, { chat_id: session.chatId, text: 'Please send a task title.' });
    return;
  }
  const plan = await ensureTodayPlan(session.linkedUserId!);
  await prisma.patientDailyPlanTask.create({
    data: {
      planId: plan.id,
      title,
      sortOrder: plan.tasks.length
    }
  });
  const updated = await updateSession(session, { state: 'ACTIVE', lastCommand: '/addtask' });
  await sendTelegramMessage(kind, { chat_id: session.chatId, text: 'Task added.' });
  await showUserPlan(kind, updated);
}

async function addTaskFromText(kind: TelegramBotKind, session: TelegramSession, text: string) {
  await addTaskTitle(kind, session, text);
}

async function promptReview(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  await updateSession(session, { state: 'ACTIVE', lastCommand: '/review' });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: 'How was today? Choose one, or add a custom note.',
    reply_markup: {
      inline_keyboard: [
        ...callbackRows(
          reviewPresets.map((review) => ({
            text: review.note.split('.')[0],
            callback_data: `user:reviewpreset:${review.key}`
          }))
        ),
        [{ text: 'Custom note', callback_data: 'user:reviewcustom' }],
        ...menuCancelRows()
      ]
    }
  });
}

async function saveReviewNote(kind: TelegramBotKind, session: TelegramSession, noteText: string) {
  if (!(await requireLinked(kind, session))) return;
  const plan = await ensureTodayPlan(session.linkedUserId!);
  await prisma.patientDailyPlan.update({
    where: { id: plan.id },
    data: { reviewNote: noteText.trim().slice(0, 2000) || null, reviewedAt: new Date() }
  });
  const updated = await updateSession(session, { state: 'ACTIVE', lastCommand: '/review' });
  await sendTelegramMessage(kind, { chat_id: session.chatId, text: 'Review saved.' });
  await showUserPlan(kind, updated);
}

async function saveReviewFromText(kind: TelegramBotKind, session: TelegramSession, text: string) {
  await saveReviewNote(kind, session, text);
}

async function toggleTask(kind: TelegramBotKind, session: TelegramSession, taskId: string) {
  if (!(await requireLinked(kind, session))) return;
  const task = await prisma.patientDailyPlanTask.findFirst({
    where: { id: taskId, plan: { userId: session.linkedUserId! } }
  });
  if (!task) {
    await sendTelegramMessage(kind, { chat_id: session.chatId, text: 'Task not found.' });
    return;
  }
  await prisma.patientDailyPlanTask.update({
    where: { id: task.id },
    data: {
      completed: !task.completed,
      completedAt: task.completed ? null : new Date(),
      reviewTick: !task.completed || task.reviewTick
    }
  });
  await showUserPlan(kind, session);
}

async function promptLead(
  kind: TelegramBotKind,
  session: TelegramSession,
  leadKind: 'BOOKING' | 'VOLUNTEER' | 'SUPPORT'
) {
  const metadata: SessionMetadata = {
    ...metadataOf(session),
    pendingLead: { kind: leadKind }
  };
  await updateSession(session, {
    state: 'ACTIVE',
    metadata: metadata as Prisma.InputJsonValue,
    lastCommand: leadKind === 'BOOKING' ? '/book' : '/volunteer'
  });
  await promptLeadConcern(kind, session, leadKind);
}

async function promptLeadConcern(
  kind: TelegramBotKind,
  session: TelegramSession,
  leadKind: 'BOOKING' | 'VOLUNTEER' | 'SUPPORT'
) {
  const options =
    leadKind === 'BOOKING'
      ? bookingConcernOptions
      : leadKind === 'SUPPORT'
        ? supportConcernOptions
        : volunteerConcernOptions;
  const [fullSessionUrl, depositUrl, volunteerTalkUrl, whatsappButton] = await Promise.all([
    sessionPaymentUrl(session),
    sessionPaymentUrl(session, 'PARTIAL'),
    volunteerTalkPaymentUrl(session),
    whatsappJoinButton()
  ]);
  const paymentRows: InlineButton[][] =
    leadKind === 'BOOKING'
      ? [
          [
            { text: 'Book & pay now', url: fullSessionUrl },
            { text: 'Pay deposit', url: depositUrl }
          ],
          [{ text: 'Retry pending payment', url: dashboardPaymentUrl(session) }]
        ]
      : leadKind === 'SUPPORT'
        ? [
            [
              {
                text: 'Open support page',
                url: webUrl(withTelegramSource('/contact', session, { action: 'support' }))
              },
              { text: 'My dashboard', url: dashboardPaymentUrl(session) }
            ],
            [
              { text: 'Payment help', url: webUrl('/payment-policy') },
              { text: 'Donate', url: donationPaymentUrl(session) }
            ],
            [whatsappButton]
          ]
        : [
            [
              { text: 'Pay for listener talk', url: volunteerTalkUrl },
              { text: 'Become listener', url: volunteerApplicationUrl(session) }
            ],
            [whatsappButton],
            [{ text: 'Donate/support free talks', url: donationPaymentUrl(session) }]
          ];
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text:
      leadKind === 'BOOKING'
        ? 'What do you need help with? You can also book and pay directly below.'
        : leadKind === 'SUPPORT'
          ? 'What support do you need? Tap one option so the right team can follow up.'
          : 'What listener option do you want? Paid talk, listener application, and donation links are below.',
    reply_markup: {
      inline_keyboard: [
        ...paymentRows,
        ...callbackRows(
          options.map((option) => ({
            text: option.label,
            callback_data: `lead:concern:${option.key}`
          }))
        ),
        [{ text: 'Other / type details', callback_data: 'lead:concern:other' }],
        ...menuCancelRows()
      ]
    }
  });
}

async function setLeadConcern(kind: TelegramBotKind, session: TelegramSession, concern: string) {
  const metadata = metadataOf(session);
  const leadKind = metadata.pendingLead?.kind ?? 'BOOKING';
  const updated = await updateSession(session, {
    state: 'ACTIVE',
    metadata: {
      ...metadata,
      pendingLead: { ...(metadata.pendingLead || { kind: leadKind }), concern }
    } as Prisma.InputJsonValue
  });
  if (leadKind === 'SUPPORT' && /safety/i.test(concern)) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: [
        '<b>Safety note</b>',
        'If there is immediate danger, self-harm risk, violence, overdose, or medical emergency, contact local emergency services now or go to the nearest emergency department.',
        '',
        'Hope Hub Telegram support is not an emergency service. A listener should not handle crisis risk alone.',
        '',
        'You can still continue below so our team can follow up.'
      ].join('\n'),
      parse_mode: 'HTML'
    });
  }
  await promptLeadChannel(kind, updated);
}

async function promptLeadChannel(kind: TelegramBotKind, session: TelegramSession) {
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: 'How should the team support you?',
    reply_markup: {
      inline_keyboard: [
        ...callbackRows(
          supportChannelOptions.map((option) => ({
            text: option.label,
            callback_data: `lead:channel:${option.key}`
          }))
        ),
        ...menuCancelRows()
      ]
    }
  });
}

async function setLeadChannel(kind: TelegramBotKind, session: TelegramSession, channel: string) {
  const metadata = metadataOf(session);
  const leadKind = metadata.pendingLead?.kind ?? 'BOOKING';
  const updated = await updateSession(session, {
    state: 'ACTIVE',
    metadata: {
      ...metadata,
      pendingLead: { ...(metadata.pendingLead || { kind: leadKind }), channel }
    } as Prisma.InputJsonValue
  });
  await promptLeadTime(kind, updated);
}

async function promptLeadTime(kind: TelegramBotKind, session: TelegramSession) {
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: 'Preferred callback time?',
    reply_markup: {
      inline_keyboard: [
        ...callbackRows(
          callbackTimeOptions.map((option) => ({
            text: option.label,
            callback_data: `lead:time:${option.key}`
          }))
        ),
        [{ text: 'Custom time', callback_data: 'lead:time:custom' }],
        ...menuCancelRows()
      ]
    }
  });
}

async function createLeadRequest(
  kind: TelegramBotKind,
  session: TelegramSession,
  timeText?: string
) {
  const metadata = metadataOf(session);
  const leadKind = metadata.pendingLead?.kind ?? 'BOOKING';
  const pendingLead = metadata.pendingLead || { kind: leadKind };
  const linkedUser = session.linkedUser;
  const name = linkedUser?.name || telegramDisplayName(session);
  const concernPrefix =
    leadKind === 'VOLUNTEER'
      ? 'Listener support request'
      : leadKind === 'SUPPORT'
        ? 'Telegram support request'
        : 'Telegram booking request';
  const concern = [
    pendingLead.concern || 'Not selected',
    pendingLead.channel ? `Support: ${pendingLead.channel}` : '',
    timeText || pendingLead.time ? `Preferred time: ${timeText || pendingLead.time}` : ''
  ]
    .filter(Boolean)
    .join(' | ');
  const lead = await upsertWebsiteLead({
    source: 'CHAT_BOT',
    visitorName: name,
    visitorEmail: linkedUser?.email ?? null,
    visitorPhone: linkedUser?.mobile ?? null,
    visitorKey: `telegram:${session.botKind}:${session.chatId}`,
    concern: `${concernPrefix}: ${concern}`.slice(0, 1200),
    preferredCallbackTime: timeText || pendingLead.time || null,
    entryPage: `telegram:${botSlugByKind[session.botKind]}`,
    userId: linkedUser?.id ?? null
  });

  const isSafetySupportLead =
    leadKind === 'SUPPORT' &&
    /safety|self[-\s]?harm|suicide|unsafe|danger|emergency/i.test(concern);
  await notifyAdminsAboutTelegramLead(session, lead, {
    kind: leadKind,
    concern,
    preferredCallbackTime: timeText || pendingLead.time || null,
    safety: isSafetySupportLead
  });

  const nextMetadata: SessionMetadata = { ...metadata };
  delete nextMetadata.pendingLead;
  const updated = await updateSession(session, {
    state: 'ACTIVE',
    metadata: nextMetadata as Prisma.InputJsonValue,
    lastCommand:
      leadKind === 'BOOKING' ? '/book' : leadKind === 'SUPPORT' ? '/support' : '/volunteer'
  });
  const [fullSessionUrl, depositUrl, volunteerTalkUrl, whatsappButton] = await Promise.all([
    sessionPaymentUrl(updated),
    sessionPaymentUrl(updated, 'PARTIAL'),
    volunteerTalkPaymentUrl(updated),
    whatsappJoinButton()
  ]);

  await sendTelegramMessage(kind, {
    chat_id: updated.chatId,
    text: [
      '<b>Request saved</b>',
      'Ops can now follow up.',
      `Lead ID: ${escapeHtml(lead.id.slice(-8))}`,
      '',
      leadKind === 'BOOKING'
        ? 'If you want to move faster, you can book and pay securely now.'
        : leadKind === 'SUPPORT'
          ? 'The team can follow up. You can also open dashboard, payment help, or contact page below.'
          : 'You can pay for a listener/support talk, apply as a listener, or donate to support free talks.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard:
        leadKind === 'BOOKING'
          ? [
              [
                { text: 'Book & pay now', url: fullSessionUrl },
                { text: 'Pay deposit', url: depositUrl }
              ],
              [{ text: 'Retry pending payment', url: dashboardPaymentUrl(updated) }],
              [{ text: 'Main menu', callback_data: 'common:menu' }]
            ]
          : leadKind === 'SUPPORT'
            ? [
                [
                  {
                    text: 'Open contact page',
                    url: webUrl(withTelegramSource('/contact', updated, { action: 'support' }))
                  },
                  { text: 'My dashboard', url: dashboardPaymentUrl(updated) }
                ],
                [
                  { text: 'Payment help', url: webUrl('/payment-policy') },
                  { text: 'Main menu', callback_data: 'common:menu' }
                ],
                [whatsappButton]
              ]
            : [
                [
                  { text: 'Pay for support talk', url: volunteerTalkUrl },
                  { text: 'Become listener', url: volunteerApplicationUrl(updated) }
                ],
                [whatsappButton],
                [{ text: 'Donate/support free talks', url: donationPaymentUrl(updated) }],
                [{ text: 'Main menu', callback_data: 'common:menu' }]
              ]
    }
  });
}

async function createLeadFromText(kind: TelegramBotKind, session: TelegramSession, text: string) {
  if (session.state === 'WAITING_LEAD_CUSTOM_TIME') {
    await createLeadRequest(kind, session, text.trim().slice(0, 120));
    return;
  }
  if (session.state === 'WAITING_LEAD_CUSTOM_CONCERN') {
    await setLeadConcern(kind, session, text.trim().slice(0, 240));
    return;
  }
  await createLeadRequest(kind, session, text.trim().slice(0, 1200));
}

async function handlePendingState(kind: TelegramBotKind, session: TelegramSession, text: string) {
  if (
    session.state === 'WAITING_PROVIDER_APPLICATION_TRACK' ||
    session.state === 'WAITING_PROVIDER_APPLICATION_NAME' ||
    session.state === 'WAITING_PROVIDER_APPLICATION_CONTACT' ||
    session.state === 'WAITING_PROVIDER_APPLICATION_QUALIFICATION' ||
    session.state === 'WAITING_PROVIDER_APPLICATION_AVAILABILITY' ||
    session.state === 'WAITING_PROVIDER_APPLICATION_WHY'
  ) {
    return handleProviderApplicationText(kind, session, text);
  }

  if (session.state === 'WAITING_LINK_EMAIL') {
    await startLink(kind, session, text);
    return true;
  }
  if (session.state === 'WAITING_SIGNUP_EMAIL') {
    await startSignup(kind, session, text);
    return true;
  }
  if (session.state === 'WAITING_SIGNUP_NAME') {
    await finishSignup(kind, session, text);
    return true;
  }
  if (session.state === 'LINK_OTP' && /^\d{4,8}$/.test(text.trim())) {
    await verifyLink(kind, session, text);
    return true;
  }
  if (session.state === 'WAITING_USER_PLAN_TASK') {
    await addTaskFromText(kind, session, text);
    return true;
  }
  if (session.state === 'WAITING_USER_PLAN_REVIEW') {
    await saveReviewFromText(kind, session, text);
    return true;
  }
  if (session.state === 'ASSESSMENT_IN_PROGRESS') {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Please answer using the buttons under the assessment question.',
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return true;
  }
  if (session.state === 'ASSESSMENT_PAUSED') {
    const pending = metadataOf(session).pendingAssessment;
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: pending
        ? 'Your assessment is paused. Continue, retake, or cancel it using the buttons.'
        : 'Choose an option or send /help.',
      reply_markup: {
        inline_keyboard: pending
          ? [
              [
                { text: 'Continue assessment', callback_data: 'assessment:resume' },
                { text: 'Retake', callback_data: `assessment:start:${pending.assessmentId}` }
              ],
              [{ text: 'Cancel assessment', callback_data: 'common:cancel' }]
            ]
          : menuCancelRows()
      }
    });
    return true;
  }
  if (
    session.state === 'WAITING_LEAD_CONCERN' ||
    session.state === 'WAITING_LEAD_CUSTOM_CONCERN' ||
    session.state === 'WAITING_LEAD_CUSTOM_TIME'
  ) {
    await createLeadFromText(kind, session, text);
    return true;
  }
  return false;
}

async function handleCommand(kind: TelegramBotKind, session: TelegramSession, text: string) {
  const [commandRaw, ...rest] = text.trim().split(/\s+/);
  const command = (commandRaw || '').toLowerCase();
  const argText = rest.join(' ');

  if (!command || !command.startsWith('/')) {
    if (await handlePendingState(kind, session, text)) return 'state';
    await replyMenu(kind, session, 'Choose an option or send /help.');
    return 'message';
  }

  if (command === '/start' || command === '/menu') {
    await replyMenu(kind, session, startGuideText(kind, session));
    return command;
  }

  if (command === '/help') {
    await replyMenu(kind, session, helpText(kind));
    return command;
  }

  if (command === '/link') {
    await startLink(kind, session, argText);
    return command;
  }

  if (command === '/signup') {
    await startSignup(kind, session, argText);
    return command;
  }

  if (command === '/verify') {
    await verifyLink(kind, session, argText);
    return command;
  }

  if (command === '/unlink') {
    await unlink(kind, session);
    return command;
  }

  if (command === '/me') {
    await showMe(kind, session);
    return command;
  }

  if (command === '/settings') {
    await showSettings(kind, session);
    return command;
  }

  if (command === '/onboarding') {
    await showOnboarding(kind, session);
    return command;
  }

  if (kind === TelegramBotKind.USER) {
    if (command === '/plan') await showUserPlan(kind, session);
    else if (command === '/assessments' || command === '/assessment')
      await listAssessments(kind, session);
    else if (command === '/results') await showAssessmentResults(kind, session);
    else if (command === '/requests') await showUserRequests(kind, session);
    else if (command === '/addtask') await promptAddTask(kind, session);
    else if (command === '/review') await promptReview(kind, session);
    else if (command === '/book') await promptLead(kind, session, 'BOOKING');
    else if (command === '/support') await promptLead(kind, session, 'SUPPORT');
    else if (command === '/whatsapp') await showWhatsAppJoin(kind, session);
    else if (command === '/payments' || command === '/pay') await showPaymentHub(kind, session);
    else if (command === '/volunteer') await promptLead(kind, session, 'VOLUNTEER');
    else await replyMenu(kind, session, 'Choose an option or send /help.');
    return command;
  }

  if (kind === TelegramBotKind.DOCTOR) {
    if (command === '/signup') await startProviderSignup(kind, session);
    else if (command === '/services' || command === '/pricing')
      await showProviderServices(kind, session);
    else if (command === '/availability' || command === '/slots')
      await showProviderAvailability(kind, session);
    else if (command === '/assignments') await showProviderAssignments(kind, session);
    else if (command === '/queue') await doctorQueue(kind, session);
    else if (command === '/outcomes' || command === '/close')
      await showDoctorOutcomeSessions(kind, session);
    else if (command === '/online') await setDoctorPresence(kind, session, true);
    else if (command === '/offline') await setDoctorPresence(kind, session, false);
    else await replyMenu(kind, session, 'Choose an option or send /help.');
    return command;
  }

  if (command === '/summary') await adminSummary(kind, session);
  else if (command === '/quality') await adminQualitySummary(kind, session, 30);
  else if (command === '/leads') await adminLeads(kind, session);
  else if (command === '/contributors') await adminContributors(kind, session);
  else await replyMenu(kind, session, 'Choose an option or send /help.');
  return command;
}

async function handleCallback(
  kind: TelegramBotKind,
  session: TelegramSession,
  query: TelegramCallbackQuery
) {
  const data = query.data || '';
  await answerTelegramCallback(kind, query.id);

  if (data === 'common:menu') {
    await replyMenu(kind, session, 'Menu');
    return;
  }
  if (data === 'common:cancel') {
    await cancelPending(kind, session);
    return;
  }
  if (data === 'common:link') {
    await startLink(kind, session);
    return;
  }
  if (data === 'common:signup') {
    await startSignup(kind, session);
    return;
  }
  if (data === 'common:resend_otp') {
    const pending = metadataOf(session).pendingLink;
    if (pending?.email) await startLink(kind, session, pending.email);
    else await startLink(kind, session);
    return;
  }
  if (data === 'common:me') {
    await showMe(kind, session);
    return;
  }
  if (data === 'common:settings') {
    await showSettings(kind, session);
    return;
  }
  if (data === 'common:toggle_daily_reminders') {
    await toggleDailyReminders(kind, session);
    return;
  }
  if (data === 'common:onboarding') {
    await showOnboarding(kind, session);
    return;
  }
  if (data === 'common:unlink') {
    await unlink(kind, session);
    return;
  }

  if (kind === TelegramBotKind.USER) {
    if (data === 'user:plan') await showUserPlan(kind, session);
    else if (data === 'user:assessments') await listAssessments(kind, session);
    else if (data === 'user:results') await showAssessmentResults(kind, session);
    else if (data === 'user:requests') await showUserRequests(kind, session);
    else if (data === 'user:payments') await showPaymentHub(kind, session);
    else if (data === 'user:whatsapp') await showWhatsAppJoin(kind, session);
    else if (data.startsWith('assessment:start:'))
      await startAssessment(kind, session, data.slice('assessment:start:'.length));
    else if (data.startsWith('assessment:plan:'))
      await createPlanFromAssessment(kind, session, data.slice('assessment:plan:'.length));
    else if (data === 'assessment:back') await goBackAssessment(kind, session);
    else if (data === 'assessment:pause') await pauseAssessment(kind, session);
    else if (data === 'assessment:resume') await resumeAssessment(kind, session);
    else if (data.startsWith('assessment:answer:'))
      await recordAssessmentAnswer(kind, session, Number(data.slice('assessment:answer:'.length)));
    else if (data === 'user:addtask') await promptAddTask(kind, session);
    else if (data === 'user:addcustom') {
      await updateSession(session, { state: 'WAITING_USER_PLAN_TASK', lastCommand: '/addtask' });
      await sendTelegramMessage(kind, {
        chat_id: session.chatId,
        text: 'Type the custom task you want to add for today.',
        reply_markup: { inline_keyboard: menuCancelRows() }
      });
    } else if (data.startsWith('user:addpreset:')) {
      const preset = planTaskPresets.find(
        (task) => task.key === data.slice('user:addpreset:'.length)
      );
      if (preset) await addTaskTitle(kind, session, preset.title);
      else await promptAddTask(kind, session);
    } else if (data === 'user:review') await promptReview(kind, session);
    else if (data === 'user:reviewcustom') {
      await updateSession(session, { state: 'WAITING_USER_PLAN_REVIEW', lastCommand: '/review' });
      await sendTelegramMessage(kind, {
        chat_id: session.chatId,
        text: 'Type your end-of-day review note.',
        reply_markup: { inline_keyboard: menuCancelRows() }
      });
    } else if (data.startsWith('user:reviewpreset:')) {
      const preset = reviewPresets.find(
        (review) => review.key === data.slice('user:reviewpreset:'.length)
      );
      if (preset) await saveReviewNote(kind, session, preset.note);
      else await promptReview(kind, session);
    } else if (data === 'user:book') await promptLead(kind, session, 'BOOKING');
    else if (data === 'user:support') await promptLead(kind, session, 'SUPPORT');
    else if (data === 'user:volunteer') await promptLead(kind, session, 'VOLUNTEER');
    else if (data.startsWith('lead:concern:')) {
      const key = data.slice('lead:concern:'.length);
      if (key === 'other') {
        await updateSession(session, { state: 'WAITING_LEAD_CUSTOM_CONCERN' });
        await sendTelegramMessage(kind, {
          chat_id: session.chatId,
          text: 'Type a short detail about what you need.',
          reply_markup: { inline_keyboard: menuCancelRows() }
        });
      } else {
        const leadKind = metadataOf(session).pendingLead?.kind ?? 'BOOKING';
        const options =
          leadKind === 'BOOKING'
            ? bookingConcernOptions
            : leadKind === 'SUPPORT'
              ? supportConcernOptions
              : volunteerConcernOptions;
        const option = options.find((item) => item.key === key);
        await setLeadConcern(kind, session, option?.label || key);
      }
    } else if (data.startsWith('lead:channel:')) {
      const key = data.slice('lead:channel:'.length);
      const option = supportChannelOptions.find((item) => item.key === key);
      await setLeadChannel(kind, session, option?.label || key);
    } else if (data.startsWith('lead:time:')) {
      const key = data.slice('lead:time:'.length);
      if (key === 'custom') {
        await updateSession(session, { state: 'WAITING_LEAD_CUSTOM_TIME' });
        await sendTelegramMessage(kind, {
          chat_id: session.chatId,
          text: 'Type your preferred callback time.',
          reply_markup: { inline_keyboard: menuCancelRows() }
        });
      } else {
        const option = callbackTimeOptions.find((item) => item.key === key);
        await createLeadRequest(kind, session, option?.label || key);
      }
    } else if (data.startsWith('user:task:'))
      await toggleTask(kind, session, data.slice('user:task:'.length));
    else await replyMenu(kind, session, 'Choose an option from the menu.');
    return;
  }

  if (kind === TelegramBotKind.DOCTOR) {
    if (data === 'doctor:signup') await startProviderSignup(kind, session);
    else if (data.startsWith('provider_signup:type:')) {
      const type = data.slice('provider_signup:type:'.length) as CareTeamMemberType;
      const option = careTeamTypeOptions.find((item) => item.type === type);
      if (option) await setProviderSignupTrack(kind, session, option.track, option.type);
      else await startProviderSignup(kind, session);
    } else if (data.startsWith('provider_signup:track:')) {
      const track = data.slice('provider_signup:track:'.length) as ProviderApplicationTrack;
      if (track in providerTrackLabels) await setProviderSignupTrack(kind, session, track);
      else await startProviderSignup(kind, session);
    } else if (data === 'provider:services') await showProviderServices(kind, session);
    else if (data === 'provider:services:templates')
      await showProviderPricingTemplates(kind, session);
    else if (data.startsWith('provider:service:templates:')) {
      await showProviderPricingTemplates(
        kind,
        session,
        data.slice('provider:service:templates:'.length)
      );
    } else if (data.startsWith('provider:service:create_template:')) {
      await createProviderServiceFromTemplate(
        kind,
        session,
        data.slice('provider:service:create_template:'.length)
      );
    } else if (data.startsWith('provider:service:apply_template:')) {
      const parts = data.split(':');
      const serviceId = parts[3];
      const templateId = parts[4];
      if (serviceId && templateId) {
        await applyTemplateToProviderService(kind, session, serviceId, templateId);
      } else {
        await showProviderServices(kind, session);
      }
    } else if (data.startsWith('provider:service:toggle:')) {
      await toggleProviderService(kind, session, data.slice('provider:service:toggle:'.length));
    } else if (data === 'provider:availability') await showProviderAvailability(kind, session);
    else if (data === 'provider:availability:add') await chooseAvailabilityService(kind, session);
    else if (data.startsWith('provider:availability:service:')) {
      const serviceId = data.slice('provider:availability:service:'.length);
      await chooseAvailabilityDay(kind, session, serviceId === 'none' ? null : serviceId);
    } else if (data.startsWith('provider:availability:day:')) {
      const parts = data.split(':');
      const serviceId = parts[3] === 'none' ? null : parts[3];
      const weekday = Number(parts[4]);
      await chooseAvailabilityTime(kind, session, serviceId, weekday);
    } else if (data.startsWith('provider:availability:create:')) {
      const parts = data.split(':');
      const serviceId = parts[3] === 'none' ? null : parts[3];
      const weekday = Number(parts[4]);
      const presetKey = parts[5];
      await createAvailabilityRuleFromPreset(kind, session, serviceId, weekday, presetKey);
    } else if (data.startsWith('provider:availability:toggle:')) {
      await toggleAvailabilityRule(
        kind,
        session,
        data.slice('provider:availability:toggle:'.length)
      );
    } else if (data.startsWith('provider:availability:generate:')) {
      await generateAvailabilitySlots(
        kind,
        session,
        data.slice('provider:availability:generate:'.length)
      );
    } else if (data === 'doctor:assignments') await showProviderAssignments(kind, session);
    else if (data === 'doctor:queue') await doctorQueue(kind, session);
    else if (data === 'doctor:outcomes') await showDoctorOutcomeSessions(kind, session);
    else if (data.startsWith('doctor:outcomes:'))
      await showDoctorOutcomeOptions(kind, session, data.slice('doctor:outcomes:'.length));
    else if (data.startsWith('doctor:outcome:')) {
      const parts = data.split(':');
      const outcome = parts[2] as
        'COMPLETED' | 'USER_MISSED' | 'PROVIDER_NO_SHOW' | 'RESCHEDULE_NEEDED';
      const consultationId = parts.slice(3).join(':');
      if (
        ['COMPLETED', 'USER_MISSED', 'PROVIDER_NO_SHOW', 'RESCHEDULE_NEEDED'].includes(outcome) &&
        consultationId
      ) {
        await applyDoctorSessionOutcome(kind, session, outcome, consultationId);
      } else {
        await replyMenu(kind, session, 'Unknown outcome action.');
      }
    } else if (data === 'doctor:online') await setDoctorPresence(kind, session, true);
    else if (data === 'doctor:offline') await setDoctorPresence(kind, session, false);
    else if (data.startsWith('provider:assign:')) {
      const [, , action, assignmentId] = data.split(':');
      if (
        action === 'accept' ||
        action === 'decline' ||
        action === 'contacted' ||
        action === 'complete'
      ) {
        await updateProviderAssignmentStatus(kind, session, assignmentId, action);
      } else {
        await replyMenu(kind, session, 'Unknown assignment action.');
      }
    } else await replyMenu(kind, session, 'Choose an option from the menu.');
    return;
  }

  if (data === 'admin:summary') await adminSummary(kind, session);
  else if (data.startsWith('admin:quality:')) {
    const days = Number(data.slice('admin:quality:'.length)) || 30;
    await adminQualitySummary(kind, session, days);
  } else if (data === 'admin:leads') await adminLeads(kind, session);
  else if (data === 'admin:contributors') await adminContributors(kind, session);
  else if (data.startsWith('admin:safety_reviewed:'))
    await markSafetyFlagReviewed(kind, session, data.slice('admin:safety_reviewed:'.length));
  else if (data.startsWith('lead:assign:')) {
    const [, , providerId, leadId] = data.split(':');
    if (providerId && leadId) {
      await setLeadAssignmentIntent(kind, session, leadId, providerId);
    } else {
      await replyMenu(kind, session, 'Unknown assignment option.');
    }
  } else if (data.startsWith('lead:followup:'))
    await markTelegramLeadFollowUp(kind, session, data.slice('lead:followup:'.length));
  else await replyMenu(kind, session, 'Choose an option from the menu.');
}

export async function handleTelegramUpdate(kind: TelegramBotKind, update: TelegramUpdate) {
  const message = update.message;
  const callback = update.callback_query;

  if (message) {
    const session = await ensureSession(kind, message.chat, message.from);
    const command = await handleCommand(kind, session, message.text || '');
    await prisma.telegramBotSession.update({
      where: { id: session.id },
      data: { lastCommand: command }
    });
    await logEvent({
      kind,
      sessionId: session.id,
      updateId: update.update_id,
      chatId: session.chatId,
      eventType: 'message',
      payload: { text: message.text || null }
    });
    return;
  }

  if (callback?.message?.chat) {
    const session = await ensureSession(kind, callback.message.chat, callback.from);
    await handleCallback(kind, session, callback);
    await logEvent({
      kind,
      sessionId: session.id,
      updateId: update.update_id,
      chatId: session.chatId,
      eventType: 'callback_query',
      payload: { data: callback.data || null }
    });
    return;
  }

  await logEvent({
    kind,
    updateId: update.update_id,
    eventType: 'unsupported_update',
    payload: update
  });
}
