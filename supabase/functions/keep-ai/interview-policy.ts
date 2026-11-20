export const INTERVIEW_MIN_ANSWERS = 8;
export const INTERVIEW_IDEAL_ANSWERS = 9;
export const INTERVIEW_MAX_ANSWERS = 10;

export type InterviewStep = { done: boolean; question: string; summary: string };

export type InterviewPersonalizationContext = {
  recipientName: string;
  relationship: string;
  occasion: string;
  intent?: string;
  contributors?: string[];
  answers?: { question: string; transcript: string }[];
};

type OccasionKind =
  | "birthday" | "anniversary" | "wedding" | "newBaby" | "mothersDay"
  | "fathersDay" | "graduation" | "thankYou" | "trip" | "milestone"
  | "memorial" | "family" | "justBecause" | "farewell" | "retirement"
  | "holiday" | "custom";

/** Recognize both the current occasion buttons and older, custom Keeps. */
export function classifyInterviewOccasion(occasion: string): OccasionKind {
  const value = (occasion || "").toLowerCase().trim();
  if (/memorial|celebration of life|in memory|remembrance|bereave|sympathy/.test(value)) return "memorial";
  if (/mother.s day|motherhood|mom.s day/.test(value)) return "mothersDay";
  if (/father.s day|fatherhood|dad.s day/.test(value)) return "fathersDay";
  if (/anniversary/.test(value)) return "anniversary";
  if (/birth ?day/.test(value)) return "birthday";
  if (/wedding|marriage|bridal/.test(value)) return "wedding";
  if (/new baby|newborn|baby shower|birth of|adoption/.test(value)) return "newBaby";
  if (/gradua|commencement/.test(value)) return "graduation";
  if (/thank.?you|appreciation|gratitude/.test(value)) return "thankYou";
  if (/trip|adventure|vacation|travel/.test(value)) return "trip";
  if (/retire/.test(value)) return "retirement";
  if (/farewell|goodbye|moving away|send.off/.test(value)) return "farewell";
  if (/christmas|holiday|hanukkah|thanksgiving|new year/.test(value)) return "holiday";
  if (/family memor|family story|family histor/.test(value)) return "family";
  if (/just because/.test(value)) return "justBecause";
  if (/milestone|achievement|promotion|new home/.test(value)) return "milestone";
  return "custom";
}

const occasionGuidance: Record<OccasionKind, string> = {
  birthday: "Celebrate this person's individuality, growth, shared memories, and what the creator hopes they know at this stage of life. Never assume their age.",
  anniversary: "Explore what the anniversary marks, how the bond has developed, meaningful ordinary moments, and what the creator treasures now. Do not assume a romantic partnership unless the relationship actually is romantic.",
  wedding: "Explore this relationship and the marriage or wedding moment: stories, hopes, support, and what deserves remembering. Do not assume the creator is marrying the recipient.",
  newBaby: "Explore the arrival or welcome of a baby, the people involved, the early moments, and what the recipient may wish to remember. The recipient may be the child, a parent, or someone else; infer which from relationship and intent, not from the occasion alone.",
  mothersDay: "Focus on the recipient's particular care, influence, ordinary sacrifices or joyful moments, without assuming the recipient is the creator's mother, or prescribing what motherhood means to them.",
  fathersDay: "Focus on the recipient's particular presence, influence, ordinary moments, and what is valued, without assuming the recipient is the creator's father or imposing stereotypes.",
  graduation: "Explore the recipient's real effort, growth, turning points, people who helped, and hopes for what comes next. Do not invent the degree, school, or future plans.",
  thankYou: "Uncover exactly what the recipient did, a moment when it mattered, and the effect of their actions. Warm appreciation can be personal or professional depending on the relationship.",
  trip: "Explore the experience shared, vivid real memories, surprising or funny details, and why this journey mattered. Do not invent a location or a scene.",
  milestone: "Explore what this specific achievement or season means, the road to it, and what deserves honoring. Do not assume the milestone type.",
  memorial: "Use a gentle, respectful, non-presumptive tone. Invite cherished memories, the person's character, their impact and legacy, and words the creator wishes to preserve. Never assume the recipient is alive, demand closure, or push a cheerful/future-facing ending.",
  family: "Explore true family stories, traditions, familiar moments, and the meaning of this particular chapter. Do not invent family members, relationships, or shared experiences.",
  justBecause: "Focus on who the recipient is and the specific, everyday reasons this relationship matters; no invented event or forced celebration.",
  farewell: "Explore the meaning of this transition, the real memories or contributions being carried forward, and the words the creator wants to leave with the recipient. Do not assume permanent separation.",
  retirement: "Explore the recipient's actual contributions, relationships, personal qualities, and meaning of this transition. Avoid assumptions about age, occupation, or retirement plans.",
  holiday: "Explore meaningful traditions and personal memories connected with this season, without assuming religion, practices, or celebrations not supplied by the creator.",
  custom: "Treat the creator's own occasion and stated intention as the anchor. Explore what this specific moment means, the recipient's role in it, and the real details worth preserving; do not recast it as a birthday, romance, or another generic celebration.",
};

function relationshipGuidance(relationship: string): string {
  const r = (relationship || "").toLowerCase();
  if (/myself/.test(r)) return "Recipient is the creator themself: invite a message to their present or future self, not memories with a separate person.";
  if (/spouse|partner|wife|husband|fianc/.test(r)) return "Recipient is a spouse or partner: shared life and romantic intimacy can be appropriate when supported by the creator, but avoid scripted romance.";
  if (/parent|mom|dad|mother|father|grandparent|in.law/.test(r)) return "Recipient is a parent, grandparent, or in-law: explore their real role and particular memories; never assume an uncomplicated family relationship.";
  if (/child|son|daughter|grandchild/.test(r)) return "Recipient is a child or younger family member: age is not provided, so keep language age-neutral until the creator provides it; encourage concrete observations and hopes.";
  if (/boss|mentor|coworker|teacher|coach|service provider|neighbor/.test(r)) return "Recipient is a professional or community connection: keep questions respectful and appropriately warm, not romantically or invasively intimate.";
  if (/pastor|faith leader/.test(r)) return "Recipient is a faith or community leader: let the creator establish any religious language; do not assume doctrine, belief, or religious themes.";
  if (/military|veteran/.test(r)) return "Recipient has a service connection: do not presume combat, trauma, sacrifice, or specific service history.";
  if (/friend|sibling|family/.test(r)) return "Recipient is a friend or family member: focus on what makes this unique bond meaningful; do not impose romantic or parental framing.";
  return "Let the creator define the nature and closeness of this relationship; never guess intimacy, life circumstances, or shared history.";
}

/** The first question must feel specific before the AI has any answers to follow. */
export function getOpeningInterviewQuestion(context: InterviewPersonalizationContext): string {
  const name = context.relationship === "Myself" ? "your future self" : (context.recipientName || "").trim() || "them";
  const romantic = /spouse|partner|wife|husband|fianc/i.test(context.relationship || "");
  switch (classifyInterviewOccasion(context.occasion)) {
    case "birthday": return "For " + name + "'s birthday, what part of who they are do you most want to celebrate?";
    case "anniversary": return romantic
      ? "Looking back on your time with " + name + ", what makes this anniversary especially meaningful?"
      : "What does this anniversary with " + name + " mean to you?";
    case "wedding": return "As " + name + " enters this wedding chapter, what do you most want them to carry with them?";
    case "newBaby": return /child|son|daughter|grandchild/i.test(context.relationship || "")
      ? "When " + name + " hears this someday, what do you want them to know about the beginning of their story?"
      : "What do you most want " + name + " to remember about welcoming this new baby?";
    case "mothersDay": return "On Mother's Day, what do you most want " + name + " to know about the difference they make?";
    case "fathersDay": return "On Father's Day, what do you most want " + name + " to know about the difference they make?";
    case "graduation": return "As " + name + " reaches graduation, what part of their journey most deserves to be honored?";
    case "thankYou": return "What has " + name + " done that you want to thank them for in a truly personal way?";
    case "trip": return "When " + name + " looks back on this adventure, what do you hope stays with them?";
    case "milestone": return "What makes this milestone in " + name + "'s life especially meaningful to you?";
    case "memorial": return "When you think of " + name + ", what about their life and character do you most want to preserve?";
    case "family": return "What part of your family's story do you most want " + name + " to remember?";
    case "justBecause": return "Without needing a special occasion, what do you wish " + name + " knew about what they mean to you?";
    case "farewell": return "As this chapter changes, what do you most want " + name + " to remember about your time together?";
    case "retirement": return "As " + name + " enters retirement, what about their journey most deserves to be remembered?";
    case "holiday": return "What about sharing this season with " + name + " makes it especially meaningful?";
    default: return "Thinking of " + name + " and this particular moment, what matters most for them to remember?";
  }
}

/** Static, occasion-specific priorities support adaptive AI without treating user text as system instructions. */
export function getInterviewGuidance(context: InterviewPersonalizationContext): string {
  const occasion = classifyInterviewOccasion(context.occasion);
  return [
    "PERSONALIZATION IS REQUIRED FOR EVERY FOLLOW-UP:",
    "Occasion lens: " + occasionGuidance[occasion],
    "Relationship lens: " + relationshipGuidance(context.relationship),
    "The structured input supplies the recipient name, the creator's exact occasion and relationship, their stated heart/intention, contributor names if any, and all earlier questions and answers.",
    "Use the stated intention as the emotional north star. Build on it instead of making them repeat it. Tie the next question to THIS person and THIS occasion, then naturally to the most meaningful specific detail in the latest answer.",
    "Do not merely insert the name into an interchangeable generic questionnaire. Occasion-specific questions should sound genuinely different across birthdays, anniversaries, memorials, gratitude, and other categories.",
    "Respect the person named in the relationship field rather than presuming that a Mother's Day gift is for one's own mother, or that an anniversary must be romantic.",
    "If the creator's story takes a more relevant, unexpected direction, follow that authentic thread over the category stereotype.",
    "Never ask for facts already answered, invent relationships or past events, assume bereavement outside a memorial context, or pressure someone to share intimate details.",
    "For multiple speakers, do not presume every contributor shares the same memory, belief, relationship, or experience.",
  ].join("\n");
}

const generalFallbackQuestions = [
  "What makes this moment or relationship so meaningful to you?",
  "What is something about this person that deserves to be noticed?",
  "Can you share a real moment together that captures what you mean?",
  "What small, ordinary detail from that time would they recognize?",
  "When have you especially seen this quality in them?",
  "How has knowing them shaped your experience of this chapter?",
  "Is there something important you have not yet found the words to say?",
  "What do you hope the recipient carries from this memory?",
  "What final thought feels most true to your relationship?",
];

export function getFallbackInterviewQuestion(answerCount: number, context?: InterviewPersonalizationContext): string {
  const index = Math.min(Math.max(0, answerCount - 1), generalFallbackQuestions.length - 1);
  if (!context) return generalFallbackQuestions[index]!;
  const name = context.relationship === "Myself" ? "your future self" : (context.recipientName || "").trim() || "them";
  const kind = classifyInterviewOccasion(context.occasion);
  if (kind === "memorial") {
    const questions = [
      "What quality of " + name + " do you most want people to remember?",
      "What ordinary thing about " + name + " still stands out to you?",
      "Can you share a real moment that shows what " + name + " was like?",
      "What small detail from that memory stays with you?",
      "When did you especially notice " + name + "'s impact on others?",
      "What did knowing " + name + " mean in your own life?",
      "Is there something about " + name + " you haven't had a chance to say?",
      "What would you want people to carry forward from " + name + "'s story?",
      "What final remembrance would feel most true to " + name + "?",
    ];
    return questions[index]!;
  }
  if (index === 0) {
    if (kind === "birthday") return "What makes " + name + " especially worth celebrating this birthday?";
    if (kind === "anniversary") return "What about this anniversary with " + name + " holds the most meaning?";
    if (kind === "thankYou") return "Why did " + name + "'s help make such a difference?";
    if (kind === "graduation") return "What have you seen " + name + " overcome or learn along the way?";
    if (kind === "trip") return "What made this adventure with " + name + " unlike any other?";
  }
  if (index === 7) return "What do you most hope " + name + " remembers about this " + (context.occasion || "moment") + "?";
  if (index === 8) return "What final thought would you most want " + name + " to hear from you?";
  if (index === 1) return "What is one quality of " + name + " that matters especially in this chapter?";
  if (index === 2) return "Can you share a real moment with " + name + " that captures what you mean?";
  if (index === 3) return "What small detail from that moment would " + name + " immediately recognize?";
  if (index === 4) return "When have you especially noticed that quality in " + name + "?";
  if (index === 5) return "How has your relationship with " + name + " shaped this experience?";
  if (index === 6) return "What is something important you still want " + name + " to know?";
  return generalFallbackQuestions[index]!;
}

/** Enforce 8–10 answers even if the model finishes early, preserving its contextual next question. */
export function enforceInterviewStep(
  answerCount: number,
  result: InterviewStep,
  context?: InterviewPersonalizationContext,
): InterviewStep {
  const count = Math.max(0, Math.floor(Number(answerCount) || 0));
  if (count >= INTERVIEW_MAX_ANSWERS) {
    return { done: true, question: "", summary: result.summary?.trim() ?? "" };
  }
  if (count < INTERVIEW_MIN_ANSWERS) {
    const question = !result.done && result.question?.trim()
      ? result.question.trim()
      : getFallbackInterviewQuestion(count, context);
    return { done: false, question, summary: "" };
  }
  if (result.done || !result.question?.trim()) {
    return { done: true, question: "", summary: result.summary?.trim() ?? "" };
  }
  return { done: false, question: result.question.trim(), summary: "" };
}
