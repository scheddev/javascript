import React, { useEffect } from "react";
import Sched from "@scheddev/sched-js";

export function BookingFlow({ clientId, resourceId, resourceGroupId, apiUrl }) {
  useEffect(() => {
    const sched = new Sched();
    window.instance = sched;
    if (!clientId || (!resourceId && !resourceGroupId) || !apiUrl) {
      console.error("Missing clientId, apiUrl or resourceId/resourceGroupId");
      return;
    }
    sched.init("sc-calendar-container", clientId, apiUrl, {
      resourceId,
      resourceGroupId,
    });
  }, [clientId, resourceId, apiUrl]);
  return <div id="sc-calendar-container"></div>;
}
