import React, { useEffect } from "react";
import Sched from "@scheddev/sched-js";

export function BookingFlow({
  clientId,
  resourceId,
  resourceGroupId,
  environment = "production",
  demoMode = false,
}) {
  useEffect(() => {
    const sched = new Sched();
    window.instance = sched;
    if (!clientId || (!resourceId && !resourceGroupId)) {
      console.error("Missing clientId or resourceId/resourceGroupId");
      return;
    }
    sched.init("sc-calendar-container", clientId, {
      resourceId,
      resourceGroupId,
      environment,
      demoMode,
    });
  }, [clientId, resourceId, resourceGroupId, environment, demoMode]);
  return <div id="sc-calendar-container"></div>;
}
