export type StageKey = "semi1" | "semi2" | "final";
export type BoardKey = "overall" | StageKey;
export type UiLanguage = "ru" | "en";
export type PublicDisplayMode = "full_name" | "first_name_last_initial" | "display_name";
export type PasswordResetMode = "preview" | "email" | "disabled";
export type ShowHighlightMode = "stage" | "current_act" | "results" | "players" | null;

export interface SubmissionCountdown {
  startedAt: string;
  endsAt: string;
  durationMinutes: number;
}

export interface AvatarTheme {
  primary: string;
  secondary: string;
  initials: string;
}

export interface RoomSummary {
  slug: string;
  name: string;
  tagline: string;
  cityLabel: string;
  seasonYear?: number;
  seasonLabel?: string;
  defaultStage: StageKey;
  isTemporary?: boolean;
  passwordRequired?: boolean;
  eventCompletedAt?: string | null;
}

export interface ShowState {
  stageKey: StageKey;
  currentActCode: string | null;
  statusText: string | null;
  highlightMode: ShowHighlightMode;
}

export interface RoomDetails extends RoomSummary {
  predictionWindows: Record<StageKey, boolean>;
  submissionCountdowns: Record<StageKey, SubmissionCountdown | null>;
  stages: StageKey[];
  showState: ShowState;
  stageMeta?: Record<StageKey, {
    expectedEntries: number;
    currentEntries: number;
    lineupReady: boolean;
    qualificationCutoff?: number | null;
  }>;
  scoringProfile?: string;
  scoringProfiles?: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}

export interface ActEntry {
  code: string;
  stageKey: StageKey;
  country: string;
  artist: string;
  song: string;
  runningOrder: number | null;
  seedOrder?: number;
  flagUrl: string;
  photoUrl?: string | null;
  profileUrl?: string | null;
  videoUrl?: string | null;
  portrait: {
    type: "poster";
    initials: string;
    primary: string;
    secondary: string;
  };
  facts: string[];
  factsLocalized?: Record<UiLanguage, string[]> | null;
  contextLabel: string;
  contextValue: string;
  blurb: string;
  contextLocalized?: {
    label: Record<UiLanguage, string>;
    value: Record<UiLanguage, string>;
  } | null;
  blurbLocalized?: Record<UiLanguage, string> | null;
  semiResult?: number | null;
  semiResultLocalized?: Record<UiLanguage, string> | null;
  juryPoints?: number | null;
  telePoints?: number | null;
  totalPoints?: number | null;
  rank?: number | null;
  revealed?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  emoji: string;
  name: string;
  avatarUrl?: string | null;
  avatarTheme?: AvatarTheme | null;
  points: number;
  rank: number;
  stages: Record<StageKey, {
    points: number;
    locked: boolean;
    submitted: boolean;
    exactMatches: string[];
  }>;
}

export interface StageResultsPayload {
  roomSlug: string;
  stage: StageKey;
  results: ActEntry[];
}

export interface ActsPayload {
  roomSlug: string;
  stage: StageKey;
  stageLabel: string;
  expectedEntries: number;
  currentEntries: number;
  lineupReady: boolean;
  qualificationCutoff?: number | null;
  acts: ActEntry[];
}

export interface StoredUser {
  id: string;
  roomSlug: string;
  firstName: string;
  lastName: string;
  emoji: string;
}

export interface AccountProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  publicName: string;
  emoji: string;
  avatarUrl: string | null;
  avatarTheme: AvatarTheme;
  publicDisplayMode: PublicDisplayMode;
  publicDisplayOptIn: boolean;
  consents: {
    policyVersion: string;
    privacyAcceptedAt: string;
    publicDisplayAcceptedAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface AuthSessionPayload {
  policyVersion: string;
  passwordResetMode: PasswordResetMode;
  account: AccountProfile | null;
}

export interface SeasonStageStats {
  stage: StageKey;
  points: number;
  exactMatchCount: number;
  closeMatchCount: number;
  totalDistance: number;
  comparedEntries: number;
  submitted: boolean;
  locked: boolean;
  revealedResults: number;
  qualificationCutoff?: number | null;
}

export interface PlayerSeasonStats {
  id: string;
  rank: number;
  name: string;
  emoji: string;
  avatarUrl?: string | null;
  avatarTheme?: AvatarTheme | null;
  totalPoints: number;
  exactMatchCount: number;
  closeMatchCount: number;
  averageDistance: number | null;
  submittedStages: number;
  lockedStages: number;
  bestStage: StageKey | null;
  stages: Record<StageKey, SeasonStageStats>;
}

export interface SeasonStatsPayload {
  roomSlug: string;
  roomName: string;
  seasonYear: number | null;
  seasonLabel: string;
  scoringProfile: string;
  overview: {
    participants: number;
    completedStages: number;
    revealedResults: number;
    leaderName: string | null;
    leaderPoints: number;
  };
  players: PlayerSeasonStats[];
}

export interface AdminSessionPayload {
  authenticated: boolean;
  rooms: RoomSummary[];
  authMethods?: {
    key: boolean;
    emailPassword: boolean;
  };
  scoringProfiles: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}

export interface AdminRoomSnapshot {
  roomSlug: string;
  predictionWindows: Record<StageKey, boolean>;
  submissionCountdowns: Record<StageKey, SubmissionCountdown | null>;
  showState: ShowState;
  scoringProfile: string;
  scoringProfiles: Array<{
    key: string;
    label: string;
    description: string;
  }>;
  participants: {
    activeCount: number;
    removedCount: number;
  };
  stageOverview: Record<StageKey, {
    submittedCount: number;
    lockedCount: number;
    revealedCount: number;
    expectedEntries: number;
    currentEntries: number;
    lineupReady: boolean;
    qualificationCutoff?: number | null;
  }>;
}

export interface AdminUserEntry {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  emoji: string;
  avatarUrl?: string | null;
  avatarTheme?: AvatarTheme | null;
  removed: boolean;
  submittedStages: StageKey[];
  lockedStages: StageKey[];
  submissionOverrides: Partial<Record<StageKey, string>>;
}

export type NoteTone =
  | "favorite"
  | "winner"
  | "vocals"
  | "staging"
  | "song"
  | "energy"
  | "memorable"
  | "skip";

export interface ActNote {
  tones: NoteTone[];
  tone?: NoteTone | null;
  text: string;
}
