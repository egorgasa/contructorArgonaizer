// Compile-time exhaustiveness helper.
//
// Use in the default branch of a switch over a discriminated union to
// guarantee that adding a new variant forces a TS error here. At runtime,
// reaching this function means the data was corrupted past the structural
// guards, so we throw rather than silently no-op.
export function assertNever(value: never): never {
  throw new Error(
    `Unhandled discriminated-union case: ${JSON.stringify(value)}`,
  );
}
