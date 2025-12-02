import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Search,
  MapPin,
  Building2,
  Calendar,
  ExternalLink,
  Filter,
} from "lucide-react";
import Loader from "../components/Loader";
import "./JobBoard.css";

const JobBoard = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const response = await axios.get(`${API_URL}/api/jobs`);
      if (response.data.success) {
        setJobs(response.data.data);
      }
    } catch (err) {
      setError("Failed to load jobs. Please try again later.");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filter === "All" || job.source === filter;
    return matchesSearch && matchesFilter;
  });

  const getSourceClass = (source) => {
    switch (source) {
      case "Unstop":
        return "source-unstop";
      case "Naukri":
        return "source-naukri";
      case "Internshala":
        return "source-internshala";
      default:
        return "source-default";
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="jobboard">
      <div className="jobboard-header">
        <div className="header-left">
          <h1 className="title">Job Board</h1>
          <p className="subtitle">
            Aggregated opportunities from top platforms
          </p>
        </div>

        <div className="header-controls">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search jobs..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            {["All", "Unstop", "Naukri", "Internshala"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`filter-btn ${filter === f ? "active" : ""}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="job-grid">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job, index) => (
            <div key={`${job.id}-${index}`} className="job-card">
              <div className="job-card-top">
                <div className="company-icon">
                  <Building2 />
                </div>
                <span className={`source-badge ${getSourceClass(job.source)}`}>
                  {job.source}
                </span>
              </div>

              <h3 className="job-title">{job.title || "Untitled Position"}</h3>
              <p className="job-company">{job.company || "Unknown Company"}</p>

              <div className="job-info">
                <div className="job-info-row">
                  <MapPin />
                  <span>{job.location || "Remote/Unspecified"}</span>
                </div>

                <div className="job-info-row">
                  <Calendar />
                  <span>Posted: {job.posted || "Recently"}</span>
                </div>
              </div>

              <a
                href={job.link}
                target="_blank"
                rel="noopener noreferrer"
                className="apply-btn"
              >
                Apply Now <ExternalLink />
              </a>
            </div>
          ))
        ) : (
          <div className="no-results">
            <Filter className="no-results-icon" />
            <p>No jobs found matching your criteria</p>
            <small>Try adjusting your search or filters</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobBoard;
