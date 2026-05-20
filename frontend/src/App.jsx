import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/customer/LoginPage";
import Signup from "./pages/customer/Signup";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<LoginPage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/signup" element={<Signup />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;