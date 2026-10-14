import { Header } from "@/components/header";
import { NewGoalForm } from "@/components/new-goal-form";

export const metadata = { title: "New goal" };

export default async function NewGoalPage({ searchParams }: PageProps<"/goals/new">) {
  const { status } = await searchParams;
  return (
    <div className="mx-auto max-w-xl">
      <Header title="New goal" back="/" />
      <NewGoalForm initialStatus={status === "future" ? "future" : "active"} />
    </div>
  );
}
