import { cn } from "@/utils";
import { type HTMLMotionProps, motion } from "framer-motion";

function Skeleton({
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn("rounded-md bg-muted", className)}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      {...props}
    />
  );
}

export { Skeleton };
