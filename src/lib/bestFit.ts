// Best Fit Greedy Allocation
// Pure function: pick smallest available lab with capacity >= student count.
export interface LabLike {
  id: string;
  name: string;
  capacity: number;
  status: string;
}

export interface BestFitResult {
  lab: LabLike | null;
  unusedSeats: number;
  considered: Array<LabLike & { fits: boolean; waste: number | null }>;
}

export function bestFit(labs: LabLike[], studentCount: number): BestFitResult {
  const available = labs.filter((l) => l.status === "available");
  const sorted = [...available].sort((a, b) => a.capacity - b.capacity);
  const chosen = sorted.find((l) => l.capacity >= studentCount) ?? null;
  const considered = sorted.map((l) => ({
    ...l,
    fits: l.capacity >= studentCount,
    waste: l.capacity >= studentCount ? l.capacity - studentCount : null,
  }));
  return {
    lab: chosen,
    unusedSeats: chosen ? chosen.capacity - studentCount : 0,
    considered,
  };
}
