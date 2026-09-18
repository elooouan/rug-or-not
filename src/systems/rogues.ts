import type { PortraitStyle } from '@/art/portraits';
import type { CaseData } from '@/data/schema';

export interface Rogue {
  name: string;
  role: string;
  seed: string;
  style: PortraitStyle;
}

/** The founder behind a rug case: first name on the team sheet, else whoever runs the chat. */
export function rogueOf(c: CaseData): Rogue {
  const team = c.documents.find((d) => d.type === 'team');
  const m = team?.type === 'team' ? team.content.members[0] : undefined;
  if (m) return { name: m.name, role: m.role, seed: m.portraitSeed, style: m.style };
  const chat = c.documents.find((d) => d.type === 'chat');
  const admin =
    chat?.type === 'chat' ? chat.content.messages.find((x) => x.role === 'admin') : undefined;
  if (admin)
    return {
      name: admin.user,
      role: 'channel admin',
      seed: `${c.id}-${admin.user}`,
      style: 'normal',
    };
  return { name: 'Unknown', role: 'deployer wallet', seed: c.id, style: 'anon' };
}
