import { redirect } from "next/navigation";

// The app opens directly into the dashboard (demo mode auto-signs-in).
export default function Home() {
  redirect("/dashboard");
}
