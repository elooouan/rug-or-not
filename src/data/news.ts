/** Fake headlines for the NetScope news page. All fictional, all nonsense. */
export interface Headline {
  title: string;
  body: string;
}

export const NEWS: Headline[] = [
  {
    title: 'Dog coin promises to pay holders back; dog unavailable for comment',
    body: 'Sources close to the dog say it "was never consulted" about the tokenomics and would like a walk.',
  },
  {
    title: 'Auditor certifies its own certificate, awards self 100/100',
    body: 'The firm, founded Tuesday, called the result "a strong signal of trust in the ecosystem."',
  },
  {
    title: 'Study finds 100% of guaranteed returns not guaranteed',
    body: 'Researchers followed 400 projects promising fixed daily yield. All 400 now promise nothing.',
  },
  {
    title: 'Windowsill cat declines board seat at Kelp DAO',
    body: '"She said no with her whole body," a steward reported. The treasury remains a 2-of-3 multisig.',
  },
  {
    title: 'Local detective solves tenth case, still cannot find pen',
    body: 'The pen was later located behind the ink pad, where it had been the entire time.',
  },
  {
    title: 'Presale "closing in 10 minutes" enters ninth consecutive day',
    body: 'Admins clarified that the countdown is "spiritual" and asked members to stop asking about liquidity.',
  },
  {
    title: 'Detective reopens closed file, finds the fee cap was never there',
    body: 'The second look, colleagues call it. "Same paper, amber marks, and suddenly you can read." The file had no comment.',
  },
  {
    title: 'Renounced token turns out to have three admins and a proxy',
    body: 'The team says renouncing "was more of a vibe" and that the admin keys are "in a safe place."',
  },
  {
    title: 'Rain continues; lamp flickers; coffee still warm',
    body: 'Weather desk reports no change. Cat reports nothing. Moon declines to comment.',
  },
  {
    title: 'Whitepaper found to be 40% another whitepaper',
    body: 'The remaining 60% is a roadmap with the wrong token name and a picture of a rocket.',
  },
  {
    title: 'Bot army recruits 3,000 members in one hour, all named cryptoking',
    body: 'A spokesperson for the army said "100x guaranteed, get in now" and then said it again.',
  },
];

/** Headlines that only run once the story has caught up with them (see STORY_BEATS). */
export const LATE_NEWS: { after: string; headline: Headline }[] = [
  {
    after: 'story-2',
    headline: {
      title: 'Same three "founders" spotted on fourth token this month',
      body: 'Stock-photo agency confirms the trio are "Business Team 4471" and have never met.',
    },
  },
  {
    after: 'story-3',
    headline: {
      title: 'Chat mods keep deleting one word. Nobody will say which.',
      body: 'Screenshots suggest a name that starts with T. The mods say it was "a typo, nine times."',
    },
  },
  {
    after: 'secret-solved',
    headline: {
      title: 'Seamless settles nothing; registrar wallet drains in one block',
      body: 'A detective stamped the file hours earlier. "Read it twice," they said. The Tailor was not available.',
    },
  },
];
