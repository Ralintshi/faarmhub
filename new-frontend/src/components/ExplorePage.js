import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../FirebaseConfig";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import logo from "./download.png";
import "./ExplorePage.css";
import {
  FaSearch,
  FaHeart,
  FaRegHeart,
  FaFilter,
  FaSort,
} from "react-icons/fa";

const toastNotificationStyles = {
  position: "fixed",
  top: "20px",
  right: "20px",
  backgroundColor: "#4caf50",
  color: "white",
  padding: "10px 20px",
  borderRadius: "5px",
  zIndex: 1000,
  boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
  maxWidth: "300px",
  wordWrap: "break-word",
};

const SERVER_URL = "http://localhost:5000";

const ExplorePage = () => {
  const [products, setProducts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toastNotification, setToastNotification] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    location: "",
    category: "",
    whatsapp: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortOption, setSortOption] = useState("newest");
  const [mediaFile, setMediaFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]); // New state for tracking user's orders
  const [quantities, setQuantities] = useState({}); // New state for order quantities

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const validProducts = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            price:
              typeof data.price === "string"
                ? parseFloat(data.price)
                : Number(data.price) || 0,
          };
        })
        .filter((product) => product && typeof product === "object");
      setProducts(validProducts);
    });

    const unsubscribeOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      const userOrders = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((order) => order.buyerId === auth.currentUser?.uid && order.status === "Pending");
      setOrders(userOrders);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5000");
    ws.onopen = () => console.log("Connected to WebSocket server");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "product_upload" || data.type === "order_placed") {
        const message = `${data.message} - ${new Date(data.timestamp).toLocaleString()}`;
        setNotifications((prev) => [message, ...prev]);
        setToastNotification(message);
        setTimeout(() => setToastNotification(null), 5000);
      }
    };
    ws.onclose = () => console.log("WebSocket disconnected, attempting to reconnect...");
    ws.onerror = (error) => console.error("WebSocket error:", error);
    return () => ws.close();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setMediaFile(file);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      localStorage.setItem("pendingProduct", JSON.stringify(newProduct));
      alert("Please log in to upload a product.");
      navigate("/login");
      return;
    }
    if (
      !newProduct.name ||
      !newProduct.description ||
      !newProduct.price ||
      !newProduct.location
    ) {
      alert("Please fill in all required fields.");
      return;
    }
    await uploadProduct();
  };

  const uploadProduct = async () => {
    if (uploading) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("name", newProduct.name);
      formData.append("description", newProduct.description);
      formData.append("price", newProduct.price);
      formData.append("location", newProduct.location);
      formData.append("category", newProduct.category);
      formData.append("whatsapp", newProduct.whatsapp);
      formData.append("userId", auth.currentUser.uid);
      if (mediaFile) {
        formData.append("mediaFile", mediaFile);
      }

      const response = await fetch(`${SERVER_URL}/api/upload-product`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload product: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Product uploaded successfully:", result);

      setNewProduct({
        name: "",
        description: "",
        price: "",
        location: "",
        category: "",
        whatsapp: "",
      });
      setMediaFile(null);
      setUploadProgress(0);
      document.querySelector('input[type="file"]').value = "";
    } catch (error) {
      console.error("Error uploading product:", error);
      alert(`Failed to upload product: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const placeOrder = async (product) => {
    if (!user) {
      alert("Please log in to place an order.");
      navigate("/login");
      return;
    }

    const quantity = quantities[product.id] || 1;
    const productPrice = safePrice(product.price) * quantity;
    const deliveryFee = 20;
    const totalAmount = productPrice + deliveryFee;

    try {
      const response = await fetch(`${SERVER_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          buyerId: user.uid,
          farmerId: product.userId,
          paymentMethod: "COD",
          totalAmount,
          productPrice,
          deliveryFee,
          quantity,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to place order: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      setToastNotification(`Order placed successfully! Order ID: ${result.orderId}`);
      setTimeout(() => setToastNotification(null), 5000);
    } catch (error) {
      console.error("Error placing order:", error);
      setToastNotification(`Failed to place order: ${error.message}`);
      setTimeout(() => setToastNotification(null), 5000);
    }
  };

  const safePrice = (price) => {
    const num = typeof price === "string" ? parseFloat(price) : Number(price);
    return isNaN(num) ? 0 : num;
  };

  const getMediaUrl = (filename) => {
    const url = filename ? `${SERVER_URL}/uploads/${filename}` : null;
    return url;
  };

  const filteredProducts = products
    .filter((product) =>
      product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((product) => {
      const price = safePrice(product.price);
      return price >= priceRange[0] && price <= priceRange[1];
    })
    .filter(
      (product) =>
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category || "uncategorized")
    )
    .sort((a, b) => {
      const priceA = safePrice(a.price);
      const priceB = safePrice(b.price);
      switch (sortOption) {
        case "price-low":
          return priceA - priceB;
        case "price-high":
          return priceB - priceA;
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        default:
          return 0;
      }
    });

  const toggleFavorite = (productId) => {
    setFavorites((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleProductExpand = (productId) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  const handleQuantityChange = (productId, value) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, parseInt(value) || 1),
    }));
  };

  const categories = [...new Set(products.map((p) => p.category || "uncategorized"))];

  return (
    <div className="explore-container">
      {toastNotification && (
        <div style={toastNotificationStyles}>{toastNotification}</div>
      )}

      <nav className="nav-bar">
        <div className="logo" onClick={() => navigate("/")}>
          <img src={logo} alt="FarmHub Logo" />
          FarmHub
        </div>
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
          />
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
        <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </div>
      </nav>

      {menuOpen && (
        <div className="menu-dropdown">
          {["/", "/marketUpdate", "/forum", "/settings", "/logout"].map(
            (path, i) => (
              <div
                key={i}
                onClick={() => navigate(path)}
                className="menu-item"
              >
                {["🏠 Home", "📊 Market Updates", "🔔 Notifications", "⚙️ Settings", "🚪 Logout"][i]}
              </div>
            )
          )}
        </div>
      )}

      <div className="form-container">
        <form onSubmit={handleProductSubmit}>
          <h2>Add a New Product</h2>
          <input
            type="text"
            placeholder="Product Name"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct({ ...newProduct, name: e.target.value })
            }
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newProduct.description}
            onChange={(e) =>
              setNewProduct({ ...newProduct, description: e.target.value })
            }
            required
          />
          <input
            type="number"
            placeholder="Price (M)"
            value={newProduct.price}
            onChange={(e) =>
              setNewProduct({ ...newProduct, price: e.target.value })
            }
            required
            step="0.01"
            min="0"
          />
          <input
            type="text"
            placeholder="Location (e.g., Maseru)"
            value={newProduct.location}
            onChange={(e) =>
              setNewProduct({ ...newProduct, location: e.target.value })
            }
            required
          />
          <input
            type="text"
            placeholder="Category (optional)"
            value={newProduct.category}
            onChange={(e) =>
              setNewProduct({ ...newProduct, category: e.target.value })
            }
          />
          <input type="file" accept="image/*,video/*" onChange={handleFileChange} />
          <button type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Product"}
          </button>
        </form>
        {uploading && (
          <div className="upload-progress">
            <progress value={uploadProgress} max="100" />
            <p>{Math.round(uploadProgress)}% uploaded</p>
          </div>
        )}
      </div>

      <div className="product-controls">
        <div className="view-toggle">
          <button
            className={viewMode === "grid" ? "active" : ""}
            onClick={() => setViewMode("grid")}
          >
            Grid View
          </button>
          <button
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            List View
          </button>
        </div>
        <div className="sort-filter-container">
          <div className="sort-dropdown">
            <FaSort />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
          <div className="price-filter">
            <FaFilter />
            <span>Price Range:</span>
            <input
              type="range"
              min="0"
              max="1000"
              value={priceRange[1]}
              onChange={(e) =>
                setPriceRange([priceRange[0], parseInt(e.target.value)])
              }
            />
            <span>
              M{priceRange[0]} - M{priceRange[1]}
            </span>
          </div>
        </div>
      </div>

      <div className="category-filters">
        <h3>Filter by Category</h3>
        {categories.map((category) => (
          <button
            key={category}
            className={selectedCategories.includes(category) ? "active" : ""}
            onClick={() =>
              setSelectedCategories((prev) =>
                prev.includes(category)
                  ? prev.filter((c) => c !== category)
                  : [...prev, category]
              )
            }
          >
            {category}
          </button>
        ))}
      </div>

      <div className="product-list">
        <h2>Available Products</h2>
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>No products found matching your criteria.</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setPriceRange([0, 1000]);
                setSelectedCategories([]);
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div
                  className="product-media"
                  onClick={() => toggleProductExpand(product.id)}
                >
                  {product.filename ? (
                    product.filename.endsWith(".mp4") ||
                    product.filename.includes("video") ? (
                      <video controls width="100%" height="auto">
                        <source src={getMediaUrl(product.filename)} type="video/mp4" />
                      </video>
                    ) : (
                      <img
                        src={getMediaUrl(product.filename)}
                        alt={product.name}
                        className="product-image"
                        onError={(e) =>
                          console.error("Image failed to load:", getMediaUrl(product.filename))
                        }
                      />
                    )
                  ) : (
                    <div className="no-media-placeholder">No Image</div>
                  )}
                  <div className="product-badge">
                    {new Date(product.createdAt) >
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                      <span className="new-badge">NEW</span>
                    )}
                    {orders.some((order) => order.productId === product.id) && (
                      <span className="order-badge">Order Pending</span>
                    )}
                  </div>
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-price">
                    M{safePrice(product.price).toFixed(2)}
                  </p>
                  <p className="product-location">{product.location}</p>
                  <p className="delivery-time">Est. Delivery: 2-3 days</p>
                  <div className="product-actions">
                    <button
                      className="favorite-btn"
                      onClick={() => toggleFavorite(product.id)}
                    >
                      {favorites.includes(product.id) ? (
                        <FaHeart color="red" />
                      ) : (
                        <FaRegHeart />
                      )}
                    </button>
                    <div className="quantity-selector">
                      <input
                        type="number"
                        min="1"
                        value={quantities[product.id] || 1}
                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                      />
                    </div>
                    <button
                      className="order-btn"
                      onClick={() => placeOrder(product)}
                      disabled={orders.some((o) => o.productId === product.id)}
                    >
                      Place Order (COD)
                    </button>
                  </div>
                  {expandedProduct === product.id && (
                    <div className="product-details-expanded">
                      <p>{product.description}</p>
                      <p className="product-date">
                        Posted: {new Date(product.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="enhanced-product-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Details</th>
                  <th>Price</th>
                  <th>Location</th>
                  <th>Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="product-cell">
                      <div className="product-media-table">
                        {product.filename ? (
                          product.filename.endsWith(".mp4") ||
                          product.filename.includes("video") ? (
                            <video controls width="80" height="auto">
                              <source src={getMediaUrl(product.filename)} type="video/mp4" />
                            </video>
                          ) : (
                            <img
                              src={getMediaUrl(product.filename)}
                              alt={product.name}
                              className="product-table-image"
                              onError={(e) =>
                                console.error("Image failed to load:", getMediaUrl(product.filename))
                              }
                            />
                          )
                        ) : (
                          <div className="no-media-placeholder">No Image</div>
                        )}
                        <span className="product-name">{product.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="product-description">
                        {product.description.length > 50 ? (
                          <>
                            {expandedProduct === product.id
                              ? product.description
                              : `${product.description.substring(0, 50)}...`}
                            <button
                              className="expand-btn"
                              onClick={() => toggleProductExpand(product.id)}
                            >
                              {expandedProduct === product.id
                                ? "Show Less"
                                : "Show More"}
                            </button>
                          </>
                        ) : (
                          product.description
                        )}
                      </div>
                    </td>
                    <td className="price-cell">
                      <span className="price-value">
                        M{safePrice(product.price).toFixed(2)}
                      </span>
                    </td>
                    <td>{product.location}</td>
                    <td>Est. Delivery: 2-3 days</td>
                    <td className="actions-cell">
                      <button
                        className="favorite-btn"
                        onClick={() => toggleFavorite(product.id)}
                      >
                        {favorites.includes(product.id) ? (
                          <FaHeart color="red" />
                        ) : (
                          <FaRegHeart />
                        )}
                      </button>
                      <div className="quantity-selector">
                        <input
                          type="number"
                          min="1"
                          value={quantities[product.id] || 1}
                          onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                        />
                      </div>
                      <button
                        className="order-btn"
                        onClick={() => placeOrder(product)}
                        disabled={orders.some((o) => o.productId === product.id)}
                      >
                        Place Order (COD)
                      </button>
                      {orders.some((order) => order.productId === product.id) && (
                        <span className="order-status">Order Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;