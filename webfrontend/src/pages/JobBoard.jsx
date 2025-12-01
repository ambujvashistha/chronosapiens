import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, Building2, Calendar, ExternalLink, Filter } from 'lucide-react';
import Loader from '../components/Loader';

const JobBoard = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchJobs()
    }, [])

    const fetchJobs = async () => {
        try {
            setLoading(true)
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.get(`${API_URL}/api/jobs`)
            if (response.data.success) {
                setJobs(response.data.data)
            }
        } catch (err) {
            setError('Failed to load jobs. Please try again later.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    };

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title?.toLowerCase().includes(searchTerm.toLowerCase()) || job.company?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filter === 'All' || job.source === filter
        return matchesSearch && matchesFilter
    });

    const getSourceColor = (source) => {
        switch (source) {
            case 'Unstop': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Naukri': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Internshala': return 'bg-sky-100 text-sky-800 border-sky-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }

    if (loading) return <Loader />

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Job Board</h1>
                    <p className="text-gray-500 mt-1">Aggregated opportunities from top platforms</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input type="text" placeholder="Search jobs..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {['All', 'Unstop', 'Naukri', 'Internshala'].map((f) => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.length > 0 ? (
                    filteredJobs.map((job, index) => (
                        <div key={`${job.id}-${index}`} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow duration-300 flex flex-col h-full group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                    <Building2 className="h-6 w-6 text-gray-600 group-hover:text-indigo-600" />
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getSourceColor(job.source)}`}>
                                    {job.source}
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2" title={job.title}>
                                {job.title || 'Untitled Position'}
                            </h3>
                            <p className="text-gray-600 text-sm mb-4 font-medium">{job.company || 'Unknown Company'}</p>

                            <div className="space-y-2 mb-6 flex-grow">
                                <div className="flex items-center text-gray-500 text-sm">
                                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <span className="truncate">{job.location || 'Remote/Unspecified'}</span>
                                </div>
                                <div className="flex items-center text-gray-500 text-sm">
                                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <span className="truncate">Posted: {job.posted || 'Recently'}</span>
                                </div>
                            </div>

                            <a href={job.link} target="_blank" rel="noopener noreferrer" className="mt-auto w-full flex items-center justify-center px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm">
                                Apply Now <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        <Filter className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">No jobs found matching your criteria</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobBoard;
