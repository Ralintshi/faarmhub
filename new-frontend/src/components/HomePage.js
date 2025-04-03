import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../FirebaseConfig";
import "./HomePage.css";
import logoImg from "./download.png";
import { Bar } from "react-chartjs-2";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Register the datalabels plugin with Chart.js
Chart.register(ChartDataLabels);

const HomePage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [weather, setWeather] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [marketPrice, setMarketPrice] = useState(null);
  const [marketDate, setMarketDate] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
   const [showDropdown, setShowDropdown] = useState(false);

  const carouselImages = ["/images/t3.jpg", "/images/g2.jpg", "/images/p1.jpg"];

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleNavigation = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  // Fetch products from Firestore with validation
  useEffect(() => {
    console.log("Setting up Firestore listener...");
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const fetchedProducts = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((product) => product && typeof product === "object" && product.name);
        console.log("Fetched Products:", fetchedProducts);
        setProducts(fetchedProducts);
      },
      (error) => {
        console.error("Firestore Error:", error.message);
        setError(`Failed to fetch products: ${error.message}`);
      }
    );
    return () => {
      console.log("Cleaning up Firestore listener...");
      unsubscribe();
    };
  }, []);

  // Fetch weather data
  useEffect(() => {
    const API_KEY = "b47e41d230faa192a7747dbed4858ef8";
    const CITY = "Maseru";
    const URL = `https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&units=metric&appid=${API_KEY}`;

    fetch(URL)
      .then((response) => response.json())
      .then((data) => {
        if (data && data.list) {
          setWeather({
            forecast: data.list.slice(0, 7).map((item) => ({
              temp: item.main.temp,
              condition: item.weather[0]?.description || "No condition",
              date: item.dt_txt,
            })),
          });
        }
      })
      .catch((error) => console.error("Error fetching weather data:", error));
  }, []);

  // Sample notifications
  useEffect(() => {
    setNotifications([
      "📢 New farming techniques available!",
      "📈 Market Update: Maize prices up 5%",
      "⚠️ Weather Alert: Heavy rains expected tomorrow!",
    ]);
  }, []);

  // Product carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) =>
          prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
        );
        setFade(true);
      }, 1000);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Filter products with robust validation
  const filteredProducts = (products || []).filter((product) => {
    if (!product || typeof product !== "object" || !product.name) {
      return false;
    }
    return product.name.toLowerCase().includes((searchQuery || "").toLowerCase());
  });

  // Prepare chart data (product count by name)
  const getChartData = () => {
    const productCounts = products.reduce((acc, product) => {
      acc[product.name] = (acc[product.name] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(productCounts);
    const data = Object.values(productCounts);

    return {
      labels,
      datasets: [
        {
          label: "Product Listings",
          data,
          backgroundColor: "#4caf50", // Green to match farm theme
          borderColor: "#2e7d32",
          borderWidth: 1,
          datalabels: {
            anchor: "center",
            align: "center",
            color: "#ffffff", // White for high contrast
            font: {
              family: "'Poppins', sans-serif", // Match global font
              weight: "bold",
              size: 10, // Reduced font size
            },
            rotation: 90, // Vertical text
            formatter: (value, context) => context.chart.data.labels[context.dataIndex],
            textShadowBlur: 3, // Shadow for contrast
            textShadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      ],
    };
  };

  const chartOptions = {
    maintainAspectRatio: false, // Allow chart to fill container height
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Number of Listings",
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: "bold",
          },
        },
        ticks: {
          font: {
            family: "'Poppins', sans-serif",
            size: 12,
          },
        },
      },
      x: {
        title: {
          display: true,
          text: "Products",
          font: {
            family: "'Poppins', sans-serif",
            size: 16,
            weight: "bold",
          },
        },
        ticks: {
          display: false, // Hide x-axis labels
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          font: {
            family: "'Poppins', sans-serif",
            size: 14,
          },
        },
      },
      datalabels: {
        // Plugin is enabled via dataset configuration
      },
    },
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleExploreClick = () => {
    const userToken = localStorage.getItem('userToken');
    if (userToken) {
      navigate('/explore');
    } else {
      alert('Please log in to explore products.');
      navigate('/login');
    }
  };

  return (
    <div className="homepage-container">
      <nav className="nav-bar">
        <div className="logo">
          <img src={logoImg} alt="FarmHub Logo" />
          FarmHub
        </div>
        <input
          type="text"
          className="search-bar"
          placeholder="Search products..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <div className="chart-container">
          <h2>Product Demand Overview</h2>
          {products.length > 0 ? (
            <Bar data={getChartData()} options={chartOptions} height={350} /> // Explicit height for contents
          ) : (
            <p>No products available to display in the chart.</p>
          )}
        </div>
        <div
          className="notification-container"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span className="notification-bell">🔔</span>
          {notifications.length > 0 && (
            <span className="notification-count">{notifications.length}</span>
          )}
          {showDropdown && notifications.length > 0 && (
            <div className="notification-dropdown">
              {notifications.map((notification, index) => (
                <div key={index} className="notification-item">
                  {notification}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="menu-icon" onClick={toggleMenu}>☰</div>
      </nav>

      {menuOpen && (
        <div className="menu-dropdown">
          <ul>
            <li onClick={() => handleNavigation("/")}>🏠 Home</li>
            <li onClick={() => handleNavigation("/marketUpdate")}>📊 Market Updates</li>
            <li onClick={() => handleNavigation("/announcements")}>🔔 Notifications</li>
            <li onClick={() => handleNavigation("/settings")}>⚙️ Settings</li>
            <li onClick={() => handleNavigation("/login")}>🚪 Logout</li>
          </ul>
        </div>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div className="search-results">
          {filteredProducts.length > 0 ? (
            <ul>
              {filteredProducts.map((product) => (
                <li key={product.id} onClick={() => handleNavigation(`/product/${product.id}`)}>
                  {product.name} - M{product.price || "N/A"}
                </li>
              ))}
            </ul>
          ) : (
            <p>No products found</p>
          )}
        </div>
      )}

      <div className="product-carousel">
        <img
          src={carouselImages[currentImageIndex]}
          alt={`Product ${currentImageIndex + 1}`}
          className={`product-image ${fade ? "show" : ""}`}
          onLoad={() => setFade(true)}
        />
  </div>

      {/* Product Demand Chart */}


      <div className="weather-container">
        <h2>Weather Forecast for the Next Week</h2>
        {weather ? (
          <div>
            {weather.forecast.map((forecast, index) => (
              <div key={index} className="weather-day">
                <p><strong>{forecast.date}</strong></p>
                <p className="temp">{`${forecast.temp}°C`}</p>
                <p className="condition">{forecast.condition}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>Loading weather forecast...</p>
        )}
      </div>

      <button className="cta-button" onClick={handleExploreClick}>
        Explore Products
      </button>
      <div className="auth-section">
        <button className="sign-up-btn" onClick={() => handleNavigation("/register")}>
          Sign Up
        </button>
        <button className="login-btn" onClick={() => handleNavigation("/login")}>
          Login
        </button>
      </div>

      <div className="forum-link" onClick={() => handleNavigation("/forum")}>💬</div>

      <div className="footer">
        <p>© 2025 FarmHub. All Rights Reserved.</p>
        <p>
          <a href="#">Privacy Policy</a> | <a href="#">Terms of Service</a>
        </p>
      </div>
    </div>
  );
};
export default HomePage;