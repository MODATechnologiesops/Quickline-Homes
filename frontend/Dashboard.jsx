import React from "react";
import { useNavigate } from "react-router-dom";
import "./PropertyCategories.css";

const categories = [
  {
    name: "Apartments",
    path: "/properties/apartments",
  },
  {
    name: "Malls",
    path: "/properties/malls",
  },
  {
    name: "Business Parks",
    path: "/properties/business-parks",
  },
  {
    name: "Warehouse",
    path: "/properties/warehouses",
  },
  {
    name: "Offices",
    path: "/properties/offices",
  },
  {
    name: "Villas",
    path: "/properties/villas",
  },
  {
    name: "Hotels",
    path: "/properties/hotels",
  },
  {
    name: "Land",
    path: "/properties/land",
  },
  {
    name: "Commercial",
    path: "/properties/commercial",
  },
  {
    name: "Industrial",
    path: "/properties/industrial",
  },
];

export default function PropertyCategories() {
  const navigate = useNavigate();

  return (
    <section className="property-categories">

      <div className="category-container">

        {categories.map((category) => (
          <button
            key={category.path}
            className="category-button"
            onClick={() => navigate(category.path)}
          >
            {category.name}
          </button>
        ))}

      </div>

    </section>
  );
}