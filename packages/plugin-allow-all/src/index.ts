import type { Plugin } from "@pdslite/pds";

export function pluginAllowAll(): Plugin {
  return {
    id: "allow-all",
    name: "Allow All",
    async filter() {
      return { decision: "allow" };
    },
    async blobFilter() {
      return { decision: "allow" };
    },
    async accountFilter() {
      return { decision: "allow" };
    },
  };
}
