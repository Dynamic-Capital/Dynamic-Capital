import { lazy } from "react";
import { Route } from "react-router-dom";
import { RouteTransition, PageWrapper } from "@/components/ui/route-transitions";

const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Education = lazy(() => import("./pages/Education"));
const BuildMiniApp = lazy(() => import("./pages/BuildMiniApp"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const BotStatus = lazy(() => import("./pages/BotStatus"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentStatus = lazy(() => import("./pages/PaymentStatus"));
const MiniAppDemo = lazy(() => import("./pages/MiniAppDemo"));
const TelegramSetup = lazy(() => import("./pages/TelegramSetup"));
const MiniApp = lazy(() => import("./pages/MiniApp"));
const Plans = lazy(() => import("./pages/Plans"));
const Contact = lazy(() => import("./pages/Contact"));
const VipDashboard = lazy(() => import("./pages/VipDashboard"));
const WelcomeMessage = lazy(() =>
  import("./components/welcome/WelcomeMessage").then((m) => ({ default: m.WelcomeMessage }))
);

export const appRoutes = (
  <>
    <Route
      path="/"
      element={
        <RouteTransition variant="blur">
          <PageWrapper>
            <Landing />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/dashboard"
      element={
        <RouteTransition variant="fade">
          <PageWrapper>
            <Index />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/auth"
      element={
        <RouteTransition variant="slide">
          <PageWrapper>
            <Auth />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/plans"
      element={
        <RouteTransition variant="fade">
          <PageWrapper>
            <Plans />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/contact"
      element={
        <RouteTransition variant="fade">
          <PageWrapper>
            <Contact />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/checkout"
      element={
        <RouteTransition variant="slide">
          <PageWrapper>
            <Checkout />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/payment-success"
      element={
        <RouteTransition variant="scale">
          <PageWrapper>
            <PaymentStatus />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/payment-canceled"
      element={
        <RouteTransition variant="fade">
          <PageWrapper>
            <PaymentStatus />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/payment-status"
      element={
        <RouteTransition variant="slide">
          <PageWrapper>
            <PaymentStatus />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/education"
      element={
        <RouteTransition variant="fade">
          <PageWrapper>
            <Education />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/admin"
      element={
        <RouteTransition variant="blur">
          <PageWrapper>
            <AdminDashboard />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/admin/system-health"
      element={
        <RouteTransition variant="fade">
          <PageWrapper>
            <AdminDashboard />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/bot-status"
      element={
        <RouteTransition variant="fade">
          <PageWrapper>
            <BotStatus />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/build-miniapp"
      element={
        <RouteTransition variant="slide">
          <PageWrapper>
            <BuildMiniApp />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/miniapp-demo"
      element={
        <RouteTransition variant="blur">
          <PageWrapper background={false}>
            <MiniAppDemo />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/telegram-setup"
      element={
        <RouteTransition variant="slide">
          <PageWrapper>
            <TelegramSetup />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/miniapp"
      element={
        <RouteTransition variant="blur">
          <PageWrapper background={false}>
            <MiniApp />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/vip-dashboard"
      element={
        <RouteTransition variant="fade">
          <PageWrapper>
            <VipDashboard />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="/welcome"
      element={
        <RouteTransition variant="fade">
          <PageWrapper>
            <WelcomeMessage />
          </PageWrapper>
        </RouteTransition>
      }
    />
    <Route
      path="*"
      element={
        <RouteTransition variant="fade">
          <PageWrapper>
            <NotFound />
          </PageWrapper>
        </RouteTransition>
      }
    />
  </>
);

export default appRoutes;
