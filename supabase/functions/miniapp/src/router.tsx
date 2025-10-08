import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Bank from "./pages/Bank";
import Crypto from "./pages/Crypto";
import Me from "./pages/Me";
import Admin from "./pages/Admin";
import Contact from "./pages/Contact";
import Plan from "./pages/Plan";
import Status from "./pages/Status";
import Subscription from "./pages/Subscription";
import VipDashboard from "./pages/VipDashboard";
import Token from "./pages/Token";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Home />} />
      <Route path="/bank" element={<Bank />} />
      <Route path="/crypto" element={<Crypto />} />
      <Route path="/plan" element={<Plan />} />
      <Route path="/status" element={<Status />} />
      <Route path="/me" element={<Me />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/subscription" element={<Subscription />} />
      <Route path="/vip-dashboard" element={<VipDashboard />} />
      <Route path="/token" element={<Token />} />
    </Routes>
  );
}
