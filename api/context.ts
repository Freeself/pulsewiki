import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { findUserById } from "./queries/users";
import { env } from "./lib/env";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const user = await findUserById(env.defaultUserId);
  if (!user) {
    throw new Error(
      `Default user not found (id=${env.defaultUserId}). Please create a user in the database.`,
    );
  }
  return { req: opts.req, resHeaders: opts.resHeaders, user };
}
