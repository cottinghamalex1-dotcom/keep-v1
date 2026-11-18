import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { KeepLoadingScreen } from "@/components/keep-loading-screen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Navigation between app pages uses the neutral loader; a personal
    // Keep gets its own intentional loading experience in /recipient.
    defaultPendingComponent: () => <KeepLoadingScreen />,
    defaultPendingMs: 200,
  });

  return router;
};
