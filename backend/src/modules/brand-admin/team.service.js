import { Team } from './team.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listTeams(brandId) {
  // The console lists the lead by name and shows a headcount, so resolve both
  // refs rather than returning bare ObjectIds.
  return Team.find({ brand: brandId })
    .populate('lead', 'name email')
    .populate('members', 'name')
    .sort({ name: 1 });
}

async function findOwnedOr404(brandId, id) {
  const team = await Team.findById(id);
  if (!team) throw new ApiError(404, 'Team not found');
  if (String(team.brand) !== brandId) throw new ApiError(403, 'Not authorized to access this team');
  return team;
}

export async function getTeam(brandId, id) {
  return findOwnedOr404(brandId, id);
}

export async function createTeam(brandId, { name, department, lead, region }) {
  return Team.create({ brand: brandId, name, department, lead: lead || null, region });
}

const EDITABLE_FIELDS = ['name', 'department', 'lead', 'region'];

export async function updateTeam(brandId, id, updates) {
  const team = await findOwnedOr404(brandId, id);
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) team[field] = updates[field];
  }
  await team.save();
  return team;
}

export async function addMember(brandId, id, userId) {
  const team = await findOwnedOr404(brandId, id);
  if (!team.members.some((m) => String(m) === userId)) team.members.push(userId);
  await team.save();
  return team;
}

export async function removeMember(brandId, id, userId) {
  const team = await findOwnedOr404(brandId, id);
  team.members = team.members.filter((m) => String(m) !== userId);
  await team.save();
  return team;
}

export async function deleteTeam(brandId, id) {
  const team = await findOwnedOr404(brandId, id);
  await team.deleteOne();
}
