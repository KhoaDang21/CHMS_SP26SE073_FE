/**
 * Helper utility để debug backend connection
 * Chạy trực tiếp trong browser console
 */

export const connectionDebugger = {
  // Kiểm tra backend API accessible
  async testApi() {
    const apiUrl = import.meta.env.VITE_API_URL ?? "http://163.227.230.54:8088";
    console.group("🔍 Testing Backend API Connection");
    console.log("API URL:", apiUrl);

    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("✓ Response Status:", response.status);
      console.log("✓ Response OK:", response.ok);
      const text = await response.text();
      console.log("✓ Response Body:", text);
      console.groupEnd();
      return response.ok;
    } catch (error) {
      console.error("✗ Error:", error);
      console.groupEnd();
      return false;
    }
  },

  // Kiểm tra SignalR hub endpoint
  async testSignalRHub() {
    const apiUrl = import.meta.env.VITE_API_URL ?? "http://163.227.230.54:8088";
    const hubUrl = `${apiUrl}/notificationHub`;

    console.group("🔗 Testing SignalR Hub Connection");
    console.log("Hub URL:", hubUrl);

    try {
      // Try to fetch hub endpoint (will fail but shows if server responds)
      const response = await fetch(hubUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      console.log("✓ Server responds to hub endpoint");
      console.log("✓ Status:", response.status);
      console.log("✓ Headers:", Object.fromEntries(response.headers.entries()));
      console.groupEnd();
      return true;
    } catch (error) {
      console.error("✗ Hub endpoint error:", error);
      console.groupEnd();
      return false;
    }
  },

  // Kiểm tra CORS headers
  async testCORS() {
    const apiUrl = import.meta.env.VITE_API_URL ?? "http://163.227.230.54:8088";

    console.group("🌐 Testing CORS Configuration");
    console.log("Origin:", window.location.origin);
    console.log("API URL:", apiUrl);

    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        method: "OPTIONS",
        headers: {
          Origin: window.location.origin,
          "Access-Control-Request-Method": "GET",
        },
      }).catch((e) => ({ status: 0, error: e }));

      console.log("✓ CORS Response Status:", (response as any).status);
      console.log("✓ CORS Headers:", {
        "Access-Control-Allow-Origin": (response as any).headers?.get?.(
          "Access-Control-Allow-Origin",
        ),
        "Access-Control-Allow-Credentials": (response as any).headers?.get?.(
          "Access-Control-Allow-Credentials",
        ),
      });
      console.groupEnd();
      return true;
    } catch (error) {
      console.error("✗ CORS error:", error);
      console.groupEnd();
      return false;
    }
  },

  // Xem environment variables
  printEnv() {
    console.group("🔧 Environment Configuration");
    console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
    console.log("MODE:", import.meta.env.MODE);
    console.log("DEV:", import.meta.env.DEV);
    console.log("PROD:", import.meta.env.PROD);
    console.groupEnd();
  },

  // Chạy tất cả tests
  async runAllTests() {
    console.clear();
    console.log("========== CONNECTION DEBUG REPORT ==========");

    this.printEnv();
    console.log("");

    const apiOk = await this.testApi();
    console.log("");

    const hubOk = await this.testSignalRHub();
    console.log("");

    const corsOk = await this.testCORS();
    console.log("");

    console.group("📊 SUMMARY");
    console.log("✓ API Connection:", apiOk ? "✅ OK" : "❌ FAILED");
    console.log("✓ Hub Endpoint:", hubOk ? "✅ OK" : "❌ FAILED");
    console.log("✓ CORS Setup:", corsOk ? "✅ OK" : "❌ FAILED");
    console.groupEnd();

    return { apiOk, hubOk, corsOk };
  },
};

// Export để dùng từ browser console
if (typeof window !== "undefined") {
  (window as any).debugConnection = connectionDebugger;
  console.log(
    "💡 Connection debugger available! Run: debugConnection.runAllTests()",
  );
}
