type Tone = "done" | "proc" | "draft" | "fail";

const toneClass: Record<Tone, string> = {
  done: "b-done",
  proc: "b-proc",
  draft: "b-draft",
  fail: "b-fail",
};

export function Badge({
  children,
  tone = "draft",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return <span className={`badge ${toneClass[tone]}`}>{children}</span>;
}

/** Map a project/analysis status to a badge tone. */
export function statusTone(status: string): Tone {
  switch (status) {
    case "completed":
      return "done";
    case "processing":
    case "queued":
      return "proc";
    case "failed":
      return "fail";
    default:
      return "draft";
  }
}
