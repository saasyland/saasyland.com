interface TimestampedRow {
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface TableRows {
  readonly insert: (owner: { readonly expiresAt: Date; readonly userId: string }) => readonly PromiseLike<readonly TimestampedRow[]>[]
  readonly owned?: (userId: string) => PromiseLike<readonly unknown[]>
}
