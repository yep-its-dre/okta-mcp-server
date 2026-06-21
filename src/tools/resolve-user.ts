import { getUser, searchUsers } from "../okta/client.js";
import type { OktaUser } from "../okta/types.js";
import { isEmailLike, validateEmail, validateUserQuery } from "../security/validate.js";

export type UserLookupInput = {
  email?: string;
  query?: string;
};

export type ResolvedUser = {
  user: OktaUser;
  target: string;
  resolution: "email" | "query";
};

export async function resolveUser(input: UserLookupInput): Promise<ResolvedUser> {
  if (input.email) {
    const email = validateEmail(input.email);
    return { user: await getUser(email), target: email, resolution: "email" };
  }

  if (!input.query) {
    throw new Error("Provide either email or query");
  }

  const query = validateUserQuery(input.query);
  if (isEmailLike(query)) {
    const email = validateEmail(query);
    return { user: await getUser(email), target: email, resolution: "email" };
  }

  const users = await searchUsersByNameOrQuery(query);
  if (users.length === 0) {
    throw new Error(`No Okta user matched query: ${query}`);
  }

  const exactMatches = users.filter((user) => fullName(user).toLowerCase() === query.toLowerCase());
  const candidates = exactMatches.length > 0 ? exactMatches : users;

  if (candidates.length > 1) {
    const labels = candidates.slice(0, 5).map((user) => `${fullName(user)} <${user.profile.email}>`);
    throw new Error(`Multiple Okta users matched "${query}". Use an email address. Matches: ${labels.join("; ")}`);
  }

  return { user: candidates[0], target: query, resolution: "query" };
}

function fullName(user: OktaUser): string {
  return [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ").trim();
}

async function searchUsersByNameOrQuery(query: string): Promise<OktaUser[]> {
  const directMatches = await searchUsers(query, 10);
  if (directMatches.length > 0 || !query.includes(" ")) {
    return directMatches;
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const broaderMatches = await searchUsers(terms[0], 25);
  return broaderMatches.filter((user) => {
    const haystack = [
      fullName(user),
      user.profile.firstName,
      user.profile.lastName,
      user.profile.email,
      user.profile.login
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
