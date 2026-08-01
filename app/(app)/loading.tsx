import { Spinner } from "@heroui/react";

export default function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" color="danger" />
    </div>
  );
}
