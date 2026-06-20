export type OktaUser = {
  id: string;
  status: string;
  created?: string;
  activated?: string;
  statusChanged?: string;
  lastLogin?: string;
  passwordChanged?: string;
  profile: {
    login: string;
    email: string;
    firstName?: string;
    lastName?: string;
    department?: string;
    title?: string;
    userType?: string;
    [key: string]: unknown;
  };
};

export type OktaGroup = {
  id: string;
  type: string;
  profile: {
    name: string;
    description?: string;
  };
};

export type OktaApplication = {
  id: string;
  name: string;
  label: string;
  status: string;
  signOnMode?: string;
};

export type OktaLogEvent = {
  published: string;
  eventType: string;
  severity: string;
  actor?: {
    id?: string;
    type?: string;
    displayName?: string;
    alternateId?: string;
  };
  target?: Array<{
    id?: string;
    type?: string;
    displayName?: string;
    alternateId?: string;
  }>;
  outcome?: {
    result?: string;
    reason?: string;
  };
};
