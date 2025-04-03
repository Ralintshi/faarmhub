import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { motion } from "framer-motion";

// Simplified Reply component that handles one level of comments
const Reply = ({ reply, topicId }) => {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(true);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  
  // Fetch comments for this reply
  useEffect(() => {
    const q = query(collection(db, `topics/${topicId}/replies/${reply.id}/comments`), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(commentsData);
    });
    
    return () => unsubscribe();
  }, [reply.id, topicId]);
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };
  
  const toggleComments = () => {
    setShowComments(!showComments);
  };
  
  // Add a comment to this reply
  const addComment = async () => {
    if (!replyText.trim()) return;
    
    await addDoc(collection(db, `topics/${topicId}/replies/${reply.id}/comments`), {
      text: replyText,
      timestamp: new Date(),
      author: "User", // Replace with actual user info when authentication is added
    });
    
    setReplyText("");
    setShowReplyInput(false);
  };
  
  return (
    <div style={styles.replyContainer}>
      <div style={styles.replyContent}>
        <p>{reply.text}</p>
        <div style={styles.replyMeta}>
          <span style={styles.replyAuthor}>{reply.author || "Anonymous"}</span>
          <span style={styles.timestamp}>{formatTimestamp(reply.timestamp)}</span>
        </div>
        <div style={styles.replyActions}>
          <button 
            style={styles.commentButton} 
            onClick={() => setShowReplyInput(!showReplyInput)}
          >
            Reply
          </button>
          {comments.length > 0 && (
            <button 
              style={styles.commentButton} 
              onClick={toggleComments}
            >
              {showComments ? "Hide comments" : `Show comments (${comments.length})`}
            </button>
          )}
        </div>
      </div>
      
      {showReplyInput && (
        <div style={styles.replyInputContainer}>
          <input
            style={styles.replyInput}
            placeholder="Write a comment..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <motion.button
            style={styles.replyButton}
            whileHover={{ scale: 1.05 }}
            onClick={addComment}
          >
            Post
          </motion.button>
        </div>
      )}
      
      {showComments && comments.length > 0 && (
        <div style={styles.commentsContainer}>
          {comments.map(comment => (
            <div key={comment.id} style={styles.commentItem}>
              <p>{comment.text}</p>
              <div style={styles.commentMeta}>
                <span style={styles.commentAuthor}>{comment.author || "Anonymous"}</span>
                <span style={styles.timestamp}>{formatTimestamp(comment.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Updated RepliesList component to use the simplified Reply component
const RepliesList = ({ topicId }) => {
  const [replies, setReplies] = useState([]);
  
  useEffect(() => {
    const q = query(collection(db, `topics/${topicId}/replies`), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const repliesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReplies(repliesData);
    });
    
    return () => unsubscribe();
  }, [topicId]);
  
  if (replies.length === 0) {
    return <p style={styles.noReplies}>No replies yet. Be the first to respond!</p>;
  }
  
  return (
    <div style={styles.repliesContainer}>
      <h4 style={styles.repliesTitle}>Replies</h4>
      {replies.map(reply => (
        <Reply key={reply.id} reply={reply} topicId={topicId} />
      ))}
    </div>
  );
};

const styles = {
  forumPage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    fontFamily: "'Poppins', sans-serif",
    backgroundColor: "#f9f9f9",
    minHeight: "100vh",
  },
  chatSection: {
    width: "80%",
    padding: "20px",
    borderRadius: "10px",
    backgroundColor: "white",
    boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
    transition: "0.3s ease-in-out",
    color: "#333",
    marginBottom: "30px",
  },
  chatInput: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "16px",
    outline: "none",
  },
  replyButton: {
    backgroundColor: "#4CAF50",
    color: "white",
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "0.3s",
  },
  commentButton: {
    backgroundColor: "transparent",
    color: "#4CAF50",
    padding: "5px 10px",
    border: "1px solid #4CAF50",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    marginRight: "10px",
    transition: "0.3s",
  },
  chatMessages: {
    marginTop: "20px",
    width: "100%",
  },
  chatMessage: {
    padding: "15px",
    backgroundColor: "white",
    borderRadius: "8px",
    marginBottom: "15px",
    boxShadow: "0px 2px 5px rgba(0,0,0,0.1)",
    transition: "0.3s",
  },
  replySection: {
    marginTop: "15px",
    borderTop: "1px solid #eee",
    paddingTop: "15px",
  },
  replyInput: {
    width: "80%",
    padding: "8px",
    marginRight: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
    outline: "none",
  },
  recentTopics: {
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
    width: "80%",
    textAlign: "center",
    color: "#333",
  },
  timestamp: {
    fontSize: "12px",
    color: "#888",
    marginLeft: "10px",
  },
  topicTitle: {
    fontWeight: "bold",
    fontSize: "20px",
    color: "#333",
    cursor: "pointer",
  },
  recentTopicList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    textAlign: "left",
  },
  recentTopicItem: {
    padding: "10px 0",
    fontSize: "16px",
    borderBottom: "1px solid #eee",
  },
  replyInputContainer: {
    display: "flex",
    alignItems: "center",
    marginTop: "10px",
  },
  commentsContainer: {
    marginTop: "10px",
    marginLeft: "20px",
    borderLeft: "2px solid #e0e0e0",
    paddingLeft: "10px",
  },
  commentItem: {
    padding: "8px",
    backgroundColor: "#f0f0f0",
    borderRadius: "6px",
    marginBottom: "8px",
  },
  repliesContainer: {
    marginTop: "15px",
  },
  repliesTitle: {
    fontSize: "16px",
    marginBottom: "10px",
    color: "#4CAF50",
  },
  noReplies: {
    fontStyle: "italic",
    color: "#888",
  },
  replyContainer: {
    marginBottom: "15px",
    padding: "10px",
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
  },
  replyContent: {
    fontSize: "14px",
  },
  replyMeta: {
    display: "flex",
    alignItems: "center",
    marginTop: "5px",
    fontSize: "12px",
  },
  replyAuthor: {
    fontWeight: "bold",
    color: "#4CAF50",
  },
  replyActions: {
    marginTop: "5px",
    display: "flex",
    alignItems: "center",
  },
  commentMeta: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: "5px",
    fontSize: "12px",
  },
  commentAuthor: {
    fontWeight: "bold",
    color: "#4CAF50",
  },
};

const Forum = () => {
  const [topic, setTopic] = useState("");
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedTopics, setExpandedTopics] = useState({});

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  // Create a new topic
  const createTopic = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (!topic.trim()) {
        throw new Error("Please enter a topic.");
      }

      await addDoc(collection(db, "topics"), {
        title: topic,
        timestamp: new Date(),
        author: "User", // Replace with actual user info when authentication is added
      });

      setTopic("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle topic expansion
  const toggleTopic = (topicId) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };

  // Delete topics older than 7 days
  const deleteOldTopics = (topicsData) => {
    const currentTime = new Date();
    topicsData.forEach((topic) => {
      if (!topic.timestamp) return;
      const topicTime = new Date(topic.timestamp.seconds * 1000);
      const diffTime = currentTime - topicTime;
      const diffDays = diffTime / (1000 * 3600 * 24);
      if (diffDays > 7) {
        deleteDoc(doc(db, "topics", topic.id));
      }
    });
  };

  // Fetch topics in real-time
  useEffect(() => {
    const q = query(collection(db, "topics"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topicsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTopics(topicsData);
      deleteOldTopics(topicsData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={styles.forumPage}>
      <motion.h1
        style={{ textAlign: "center", color: "#4CAF50", marginBottom: "30px" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        Community Forum
      </motion.h1>

      <motion.div 
        style={styles.chatSection} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 style={{ color: "#4CAF50", marginBottom: "15px" }}>Create a New Topic</h2>
        <input
          style={styles.chatInput}
          placeholder="What would you like to discuss?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <motion.button
          style={styles.replyButton}
          whileHover={{ scale: 1.05 }}
          onClick={createTopic}
          disabled={isLoading}
        >
          {isLoading ? "Creating..." : "Create Topic"}
        </motion.button>
        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
      </motion.div>

      <motion.div 
        style={{ ...styles.chatSection, marginTop: "20px" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 style={{ color: "#4CAF50", marginBottom: "15px" }}>Discussion Topics</h2>
        <div style={{ backgroundColor: "#f5fff5", padding: "10px", borderRadius: "5px", marginBottom: "15px" }}>
          <p style={{ margin: 0, fontSize: "14px" }}>
            <span style={{ fontWeight: "bold" }}>Note:</span> Comments are limited to one level of replies.
          </p>
        </div>
        {topics.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px" }}>No topics yet. Be the first to start a discussion!</p>
        ) : (
          <div style={styles.chatMessages}>
            {topics.map((topic) => (
              <motion.div
                key={topic.id}
                style={styles.chatMessage}
                whileHover={{ boxShadow: "0px 4px 8px rgba(0,0,0,0.2)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 
                  style={styles.topicTitle}
                  onClick={() => toggleTopic(topic.id)}
                >
                  {topic.title}
                </h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "5px" }}>
                  <span style={{ fontSize: "14px", color: "#4CAF50" }}>
                    Posted by: {topic.author || "Anonymous"}
                  </span>
                  <p style={styles.timestamp}>Created: {formatTimestamp(topic.timestamp)}</p>
                </div>
                
                {expandedTopics[topic.id] && (
                  <div style={styles.replySection}>
                    <div style={{ display: "flex", marginBottom: "15px" }}>
                      <input
                        style={styles.replyInput}
                        placeholder="Add your reply to this topic..."
                        value={topic.replyText || ""}
                        onChange={(e) => {
                          const updatedTopics = topics.map(t => 
                            t.id === topic.id ? { ...t, replyText: e.target.value } : t
                          );
                          setTopics(updatedTopics);
                        }}
                      />
                      <motion.button
                        style={styles.replyButton}
                        whileHover={{ scale: 1.05 }}
                        onClick={async () => {
                          if (!topic.replyText?.trim()) return;
                          
                          await addDoc(collection(db, `topics/${topic.id}/replies`), {
                            text: topic.replyText,
                            timestamp: new Date(),
                            author: "User", // Replace with authentication
                          });
                          
                          const updatedTopics = topics.map(t => 
                            t.id === topic.id ? { ...t, replyText: "" } : t
                          );
                          setTopics(updatedTopics);
                        }}
                      >
                        Post Reply
                      </motion.button>
                    </div>
                    <RepliesList topicId={topic.id} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div 
        style={styles.recentTopics}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 style={{ color: "#4CAF50", marginBottom: "15px" }}>Recent Topics</h2>
        <ul style={styles.recentTopicList}>
          {topics.slice(0, 5).map((topic) => (
            <li key={topic.id} style={styles.recentTopicList}>
              <span onClick={() => toggleTopic(topic.id)} style={{ cursor: "pointer", color: "#4CAF50" }}>
                {topic.title}
              </span>
              <span style={styles.timestamp}>({formatTimestamp(topic.timestamp)})</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
};

export default Forum;