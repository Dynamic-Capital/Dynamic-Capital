"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MotionButtonWrapper } from "@/components/ui/motion-theme";
import { motion } from "framer-motion";
import { dynamicMotionVariants } from "@/lib/motion-variants";

export default function DepositForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setStatus("Please select an image receipt.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setStatus("Uploading...");
    try {
      const { error } = await supabase.functions.invoke("telegram-bot", {
        body: formData,
      });
      if (error) {
        throw error;
      }
      setStatus("Deposit submitted successfully.");
      setFile(null);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-base">
      <Input type="file" accept="image/*" onChange={handleFile} />
      <MotionButtonWrapper>
        <Button type="submit">Submit</Button>
      </MotionButtonWrapper>
      {status && (
        <motion.p
          className="text-sm text-muted-foreground"
          variants={dynamicMotionVariants.stackItem}
          initial="hidden"
          animate="visible"
        >
          {status}
        </motion.p>
      )}
    </form>
  );
}
