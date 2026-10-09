import React from "react";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Home from "./pages/Dashboard";

import Apartments from "./pages/Apartments";
import Malls from "./pages/Malls";
import BusinessParks from "./pages/BusinessParks";
import Warehouses from "./pages/Warehouses";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/properties/apartments"
          element={<Apartments />}
        />

        <Route
          path="/properties/malls"
          element={<Malls />}
        />

        <Route
          path="/properties/business-parks"
          element={<BusinessParks />}
        />

        <Route
          path="/properties/warehouses"
          element={<Warehouses />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;