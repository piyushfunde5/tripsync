export type TripStatus = 'planning' | 'confirmed' | 'active' | 'completed';
export type MemberRole = 'organizer' | 'member';
export type RsvpStatus = 'pending' | 'in' | 'out' | 'maybe';
export type PollType = 'single' | 'multi' | 'date';
export type PollStatus = 'open' | 'closed';
export type DecisionStatus = 'proposed' | 'voting' | 'decided' | 'booked';
export type TaskStatus = 'assigned' | 'in_progress' | 'done' | 'overdue';
export type ExpenseCategory = 'food' | 'transport' | 'stay' | 'activity' | 'shopping' | 'other';
export type ItineraryCategory = 'travel' | 'stay' | 'food' | 'activity' | 'free_time';

export interface Trip {
  id: string;
  slug: string;
  title: string;
  destination: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  rsvp_deadline: string | null;
  budget_min: number | null;
  budget_max: number | null;
  status: TripStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  trip_id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: MemberRole;
  rsvp_status: RsvpStatus;
  rsvp_responded_at: string | null;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
}

export interface Poll {
  id: string;
  trip_id: string;
  question: string;
  poll_type: PollType;
  deadline: string;
  status: PollStatus;
  created_by: string;
  created_at: string;
  options?: PollOption[];
  votes?: PollVote[];
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  member_id: string;
  created_at: string;
}

export interface Decision {
  id: string;
  trip_id: string;
  title: string;
  category: string | null;
  status: DecisionStatus;
  decided_value: string | null;
  poll_id: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  trip_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  deadline: string | null;
  status: TaskStatus;
  created_by: string;
  created_at: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  day_number: number;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  category: ItineraryCategory | null;
  sort_order: number;
  created_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory | null;
  paid_by: string;
  created_at: string;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  member_id: string;
  share_amount: number;
}

export interface ActivityLogEntry {
  id: string;
  trip_id: string;
  member_id: string | null;
  action_type: string;
  action_detail: Record<string, unknown> | null;
  created_at: string;
}

export interface GroupFund {
  id: string;
  trip_id: string;
  target_per_person: number | null;
  treasurer_id: string | null;
  is_active: boolean;
}

export interface FundContribution {
  id: string;
  fund_id: string;
  member_id: string;
  amount: number;
  contributed_at: string;
}
