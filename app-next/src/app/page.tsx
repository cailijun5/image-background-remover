export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { HomeClient } from "./home-client";

export default function Page() {
  return <HomeClient />;
}
