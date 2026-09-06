import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { Competition } from '../models/Competition.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { Round } from '../models/Round.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { CodeMilestone } from '../models/CodeMilestone.js';
import { TieBreak } from '../models/TieBreak.js';
import { AuditLog } from '../models/AuditLog.js';

export async function purgeDemoData() {
  console.log('?? Connecting to MongoDB to purge demo data...');
  await connectDB();

  const isWipeAll = process.argv.includes('--all');

  if (isWipeAll) {
    console.log('?? --all flag specified: Performing full clean wipe of all collections...');
    const results = await Promise.all([
      User.deleteMany({}),
      College.deleteMany({}),
      Event.deleteMany({}),
      Competition.deleteMany({}),
      DynamicRound.deleteMany({}),
      Round.deleteMany({}),
      Question.deleteMany({}),
      Attempt.deleteMany({}),
      RoundProgress.deleteMany({}),
      ViolationLog.deleteMany({}),
      CodeMilestone.deleteMany({}),
      TieBreak.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    console.log('? ALL COLLECTIONS HAVE BEEN COMPLETELY PURGED.');
    console.log(`   Collections reset: 13 collections are now 100% empty for clean production use.`);
    await disconnectDB();
    return;
  }

  console.log('?? Identifying demo fixtures and seed data across all collections...');

  // 1. Find Demo Colleges
  const demoColleges = await College.find({
    $or: [
      { code: { $in: ['ABC-TECH', 'DEMO', 'TEST-COLLEGE', 'STAN', 'OXF'] } },
      { name: { $regex: /ABC Institute|Demo College|Test University/i } }
    ]
  });
  const demoCollegeIds = demoColleges.map(c => c._id);

  // 2. Find Demo Events
  const demoEvents = await Event.find({
    $or: [
      { code: { $in: ['DX26', 'DEMO', 'TEST', 'HACK26', 'TECH26'] } },
      { collegeId: { $in: demoCollegeIds } },
      { name: { $regex: /DebugX Championship|Demo Event/i } }
    ]
  });
  const demoEventIds = demoEvents.map(e => e._id);

  // 3. Find Demo Users
  const demoUserUsernames = [
    'team1', 'team2', 'team3', 'team4', 'team5', 'team6',
    'student1', 'student2', 'student3', 'student4', 'student5',
    'college_admin'
  ];
  const demoUsers = await User.find({
    $or: [
      { username: { $in: demoUserUsernames } },
      { eventId: { $in: demoEventIds } },
      { collegeId: { $in: demoCollegeIds } },
      { name: { $in: ['Binary Beasts', 'Null Pointers', 'Stack Overflows', 'Byte Benders', 'Logic Bombs', 'Syntax Strikers'] } },
      { email: { $regex: /@(debugarena\.io|example\.com|test\.com)$/i } }
    ]
  });
  const demoUserIds = demoUsers.map(u => u._id);

  console.log(`Found ${demoColleges.length} demo colleges, ${demoEvents.length} demo events, and ${demoUsers.length} demo participants/admins.`);

  // 4. Delete telemetry and child records
  const [
    delAttempts,
    delProgress,
    delViolations,
    delMilestones,
    delTieBreaks,
    delDynamicRounds,
    delRounds,
    delQuestions,
    delUsers,
    delEvents,
    delColleges,
    delCompetitions
  ] = await Promise.all([
    Attempt.deleteMany({ $or: [{ userId: { $in: demoUserIds } }, { eventId: { $in: demoEventIds } }] }),
    RoundProgress.deleteMany({ $or: [{ userId: { $in: demoUserIds } }, { eventId: { $in: demoEventIds } }] }),
    ViolationLog.deleteMany({ $or: [{ userId: { $in: demoUserIds } }, { eventId: { $in: demoEventIds } }] }),
    CodeMilestone.deleteMany({ userId: { $in: demoUserIds } }),
    TieBreak.deleteMany({ userId: { $in: demoUserIds } }),
    DynamicRound.deleteMany({ eventId: { $in: demoEventIds } }),
    Round.deleteMany({}),
    Question.deleteMany({ eventId: { $in: demoEventIds } }),
    User.deleteMany({ _id: { $in: demoUserIds } }),
    Event.deleteMany({ _id: { $in: demoEventIds } }),
    College.deleteMany({ _id: { $in: demoCollegeIds } }),
    Competition.deleteMany({ title: /DebugArena Intercollegiate Debugging Cup 2026/i })
  ]);

  console.log('====================================================');
  console.log('?? DEMO DATA PURGE COMPLETED SUCCESSFULLY:');
  console.log(`   - Users Purged:          ${delUsers.deletedCount}`);
  console.log(`   - Colleges Purged:       ${delColleges.deletedCount}`);
  console.log(`   - Events Purged:         ${delEvents.deletedCount}`);
  console.log(`   - Dynamic Rounds Purged: ${delDynamicRounds.deletedCount}`);
  console.log(`   - Legacy Rounds Purged:  ${delRounds.deletedCount}`);
  console.log(`   - Questions Purged:      ${delQuestions.deletedCount}`);
  console.log(`   - Attempts Purged:       ${delAttempts.deletedCount}`);
  console.log(`   - Progress Logs Purged:  ${delProgress.deletedCount}`);
  console.log(`   - Violations Purged:     ${delViolations.deletedCount}`);
  console.log(`   - Milestones Purged:     ${delMilestones.deletedCount}`);
  console.log(`   - TieBreaks Purged:      ${delTieBreaks.deletedCount}`);
  console.log(`   - Competitions Purged:   ${delCompetitions.deletedCount}`);
  console.log('====================================================');
  console.log('? The database is now clean and ready for real production usage.');

  await disconnectDB();
}

purgeDemoData().catch(err => {
  console.error('? Error during demo data purge:', err);
  process.exit(1);
});
