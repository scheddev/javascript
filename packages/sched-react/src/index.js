import React, { useEffect } from "react";
import Sched from "@scheddev/sched-js";

export function BookingFlow({
  clientId,
  resourceId,
  resourceGroupId,
  environment = "production",
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
    });
  }, [clientId, resourceId, resourceGroupId, environment]);
  return <div id="sc-calendar-container"></div>;
}
