import { Team } from './team.model.js';
import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { recordAction } from '../shared/auditLog.js';

export async function listTeams(brandId) {
  // The console lists the lead by name and shows a headcount, so resolve both
  // refs rather than returning bare ObjectIds.
  return Team.find({ brand: brandId })
    .populate('lead', 'name email employeeId')
    .populate('members', 'name employeeId department')
    .sort({ name: 1 });
}

async function findOwnedOr404(brandId, id) {
  const team = await Team.findOne({ _id: id, brand: brandId }).catch(() => null);
  if (!team) throw new ApiError(404, 'Team not found');
  return team;
}

/** A team's lead or member must be a user of the same brand. */
async function assertBrandUser(brandId, userId) {
  if (!userId) return;
  const ok = await User.exists({ _id: userId, role: 'brand_admin', brand: brandId }).catch(() => null);
  if (!ok) throw new ApiError(400, 'That user is not part of this brand');
}

const audit = (brandId, team, action, actor, meta) =>
  recordAction({ brand: brandId, entityType: 'Team', entityId: team._id, action, actor, meta });

export async function getTeam(brandId, id) {
  return findOwnedOr404(brandId, id);
}

export async function createTeam(brandId, { name, department, lead, region }, actor) {
  await assertBrandUser(brandId, lead);
  const team = await Team.create({ brand: brandId, name, department, lead: lead || null, region });
  await audit(brandId, team, 'team.created', actor, { name, department });
  return team;
}

const EDITABLE_FIELDS = ['name', 'department', 'lead', 'region'];

export async function updateTeam(brandId, id, updates, actor) {
  const team = await findOwnedOr404(brandId, id);
  if (updates.lead !== undefined) await assertBrandUser(brandId, updates.lead);
  const changes = {};
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined && String(updates[field]) !== String(team[field] ?? '')) {
      changes[field] = [team[field] ?? null, updates[field]];
      team[field] = updates[field];
    }
  }
  await team.save();
  if (Object.keys(changes).length) await audit(brandId, team, 'team.updated', actor, { changes });
  return team;
}

export async function addMember(brandId, id, userId, actor) {
  const team = await findOwnedOr404(brandId, id);
  await assertBrandUser(brandId, userId);
  if (!team.members.some((m) => String(m) === userId)) {
    team.members.push(userId);
    await team.save();
    await audit(brandId, team, 'team.member_added', actor, { userId });
  }
  return team;
}

export async function removeMember(brandId, id, userId, actor) {
  const team = await findOwnedOr404(brandId, id);
  const before = team.members.length;
  team.members = team.members.filter((m) => String(m) !== userId);
  if (team.members.length !== before) {
    await team.save();
    await audit(brandId, team, 'team.member_removed', actor, { userId });
  }
  return team;
}

export async function deleteTeam(brandId, id, actor) {
  const team = await findOwnedOr404(brandId, id);
  await team.deleteOne();
  await audit(brandId, team, 'team.deleted', actor, { name: team.name });
}
