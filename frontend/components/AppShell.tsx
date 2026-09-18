"use client";

import type { ReactNode } from "react";
import Header from "./Header";
import JobSheet from "./JobSheet";
import CandidateSheet from "./CandidateSheet";
import Toast from "./Toast";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="max-w-[1320px] w-full mx-auto px-7 pt-[26px] pb-20">{children}</main>
      <JobSheet />
      <CandidateSheet />
      <Toast />
    </>
  );
}
