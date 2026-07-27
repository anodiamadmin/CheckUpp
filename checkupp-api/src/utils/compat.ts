interface Timestamps {
  createdAt?: Date;
  updatedAt?: Date;
}

export const withAppwriteCompat = <T extends { id: string } & Timestamps>(record: T) => {
  const createdAt = record.createdAt?.toISOString();
  const updatedAt = record.updatedAt?.toISOString();

  return {
    ...record,
    $id: record.id,
    ...(createdAt ? { createdAt, $createdAt: createdAt } : {}),
    ...(updatedAt ? { updatedAt, $updatedAt: updatedAt } : {}),
  };
};
