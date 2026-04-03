"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";

interface Author { first_name: string; last_name: string; full_name: string; role?: string; }
interface Announcement { id: number; title: string; content: string; image_url: string | null; created_at: string; author_id: number; members: Author; }
interface Comment { id: number; content: string; created_at: string; members: Author; }
interface Achievement { id: number; title: string; content: string; image_url: string | null; approved: boolean; created_at: string; author_id: number; members: Author; }
interface TopDonor { member_id: number; total: number; name: string; chapter: string; }

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function NewsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"announcements" | "achievements">("announcements");

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ title: "", content: "" });
  const [postImage, setPostImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  // Comments
  const [commentsByAnnouncement, setCommentsByAnnouncement] = useState<Record<number, Comment[]>>({});
  const [expandedComments, setExpandedComments] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  // Achievements
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAchForm, setShowAchForm] = useState(false);
  const [achForm, setAchForm] = useState({ title: "", content: "" });
  const [achImage, setAchImage] = useState<string | null>(null);
  const [achPosting, setAchPosting] = useState(false);

  // Top donors
  const [topDonors, setTopDonors] = useState<{ year: number; top_this_year: TopDonor[]; top_all_time: TopDonor[] } | null>(null);

  const isActive = user?.status === "active" || user?.status === "immortal";
  const canPost = isActive && (user?.role === "admin" || user?.role === "board_member");

  const loadAnnouncements = useCallback(() => {
    fetch("/api/announcements").then(r => r.json()).then(setAnnouncements);
  }, []);
  const loadAchievements = useCallback(() => {
    fetch("/api/achievements").then(r => r.json()).then(setAchievements);
  }, []);

  useEffect(() => {
    loadAnnouncements();
    loadAchievements();
    fetch("/api/top-donors").then(r => r.json()).then(setTopDonors);
  }, [loadAnnouncements, loadAchievements]);

  async function loadComments(announcementId: number) {
    const res = await fetch(`/api/announcements/${announcementId}/comments`);
    const data = await res.json();
    setCommentsByAnnouncement(prev => ({ ...prev, [announcementId]: data }));
  }

  async function handleUploadImage(file: File): Promise<string | null> {
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2MB"); return null; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload-image", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) { const e = await res.json(); alert(e.error || "Upload failed"); return null; }
    const { url } = await res.json();
    return url;
  }

  async function handlePostAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...postForm, image_url: postImage }),
    });
    if (res.ok) {
      setShowPostForm(false); setPostForm({ title: "", content: "" }); setPostImage(null);
      loadAnnouncements();
    } else { const d = await res.json(); alert(d.error || "Failed"); }
    setPosting(false);
  }

  async function handlePostComment(announcementId: number) {
    if (!commentDraft.trim()) return;
    await fetch(`/api/announcements/${announcementId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentDraft }),
    });
    setCommentDraft("");
    loadComments(announcementId);
  }

  async function handleDeleteAnnouncement(id: number) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    loadAnnouncements();
  }

  async function handlePostAchievement(e: React.FormEvent) {
    e.preventDefault();
    setAchPosting(true);
    const res = await fetch("/api/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...achForm, image_url: achImage }),
    });
    if (res.ok) {
      const data = await res.json();
      setShowAchForm(false); setAchForm({ title: "", content: "" }); setAchImage(null);
      if (!data.approved) alert("Achievement submitted! It will appear once approved by a board member or admin.");
      loadAchievements();
    } else { const d = await res.json(); alert(d.error || "Failed"); }
    setAchPosting(false);
  }

  async function handleApproveAchievement(id: number, approved: boolean) {
    await fetch(`/api/achievements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    loadAchievements();
  }

  async function handleDeleteAchievement(id: number) {
    if (!confirm("Delete this achievement?")) return;
    await fetch(`/api/achievements/${id}`, { method: "DELETE" });
    loadAchievements();
  }

  const medals = ["🥇", "🥈", "🥉", "4th", "5th"];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Masig News</h1>
      <p className="text-sm text-gray-500 mb-6">Announcements, achievements, and top donors</p>

      {/* Top Donors */}
      {topDonors && (topDonors.top_this_year.length > 0 || topDonors.top_all_time.length > 0) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Donors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topDonors.top_this_year.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 mb-2">This Year ({topDonors.year})</h3>
                {topDonors.top_this_year.map((d, i) => (
                  <div key={d.member_id} className="flex items-center gap-2 py-1.5">
                    <span className="text-lg w-8 text-center">{medals[i]}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate block">{d.name}</span>
                      <span className="text-xs text-gray-400">{d.chapter}</span>
                    </div>
                    <span className="text-sm font-bold text-[#c9a227]">₱{d.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {topDonors.top_all_time.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 mb-2">All Time</h3>
                {topDonors.top_all_time.map((d, i) => (
                  <div key={d.member_id} className="flex items-center gap-2 py-1.5">
                    <span className="text-lg w-8 text-center">{medals[i]}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate block">{d.name}</span>
                      <span className="text-xs text-gray-400">{d.chapter}</span>
                    </div>
                    <span className="text-sm font-bold text-[#c9a227]">₱{d.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setTab("announcements")} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === "announcements" ? "bg-[#1a3a7a] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Announcements
        </button>
        <button onClick={() => setTab("achievements")} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === "achievements" ? "bg-[#1a3a7a] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Achievements
        </button>
      </div>

      {/* Announcements Tab */}
      {tab === "announcements" && (
        <div>
          {canPost && (
            <div className="mb-4">
              {!showPostForm ? (
                <button onClick={() => setShowPostForm(true)} className="w-full bg-white rounded-lg shadow p-4 text-left text-gray-400 hover:text-gray-600 text-sm border-2 border-dashed border-gray-200 hover:border-[#1a3a7a]">
                  + Write an announcement...
                </button>
              ) : (
                <form onSubmit={handlePostAnnouncement} className="bg-white rounded-lg shadow p-5 space-y-3">
                  <input type="text" required placeholder="Announcement title" value={postForm.title} onChange={(e) => setPostForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-medium" />
                  <textarea required placeholder="Write your announcement..." rows={4} value={postForm.content} onChange={(e) => setPostForm(f => ({ ...f, content: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  {postImage && (
                    <div className="relative">
                      <img src={postImage} alt="Preview" className="w-full max-h-64 object-contain rounded-md bg-gray-50 mx-auto block" />
                      <button type="button" onClick={() => setPostImage(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">&times;</button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-[#1a3a7a] hover:underline cursor-pointer">
                      {uploading ? "Uploading..." : "Add image"}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const url = await handleUploadImage(file); if (url) setPostImage(url);
                        e.target.value = "";
                      }} />
                    </label>
                    <div className="flex-1" />
                    <button type="button" onClick={() => { setShowPostForm(false); setPostImage(null); }} className="px-3 py-1.5 text-sm text-gray-500">Cancel</button>
                    <button type="submit" disabled={posting} className="px-4 py-1.5 bg-[#c9a227] text-white rounded-md text-sm font-medium hover:bg-[#b08f1f] disabled:opacity-50">
                      {posting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {announcements.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No announcements yet</div>}

          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-lg shadow mb-4 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{a.title}</h3>
                    <p className="text-xs text-gray-400">
                      {a.members?.full_name}
                      <span className="ml-1 text-xs bg-blue-50 text-blue-600 rounded-full px-1.5 py-0.5">{a.members?.role === "admin" ? "Admin" : "Board"}</span>
                      <span className="ml-2">{timeAgo(a.created_at)}</span>
                    </p>
                  </div>
                  {canPost && (
                    <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-gray-300 hover:text-red-500 text-sm">&times;</button>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{a.content}</p>
                {a.image_url && (
                  <img src={a.image_url} alt="" className="w-full max-h-96 object-contain rounded-md bg-gray-50 mx-auto block mb-3" />
                )}

                {/* Comments */}
                <div className="border-t border-gray-100 pt-3">
                  <button onClick={() => {
                    if (expandedComments === a.id) { setExpandedComments(null); } else { setExpandedComments(a.id); loadComments(a.id); }
                  }} className="text-xs text-gray-500 hover:text-[#1a3a7a]">
                    {expandedComments === a.id ? "Hide comments" : `Comments${commentsByAnnouncement[a.id]?.length ? ` (${commentsByAnnouncement[a.id].length})` : ""}`}
                  </button>

                  {expandedComments === a.id && (
                    <div className="mt-3 space-y-2">
                      {(commentsByAnnouncement[a.id] || []).map((c) => (
                        <div key={c.id} className="flex gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(c.members?.first_name || "?").charAt(0)}
                          </div>
                          <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1">
                            <span className="text-xs font-medium text-gray-900">{c.members?.full_name}</span>
                            <span className="text-xs text-gray-400 ml-2">{timeAgo(c.created_at)}</span>
                            <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                          </div>
                        </div>
                      ))}

                      {isActive && (
                        <div className="flex gap-2 mt-2">
                          <input type="text" placeholder="Write a comment..." value={expandedComments === a.id ? commentDraft : ""} onChange={(e) => setCommentDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(a.id); } }}
                            className="flex-1 border border-gray-300 rounded-full px-3 py-1.5 text-sm" />
                          <button onClick={() => handlePostComment(a.id)} className="px-3 py-1.5 bg-[#1a3a7a] text-white rounded-full text-xs">Post</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Achievements Tab */}
      {tab === "achievements" && (
        <div>
          {isActive && (
            <div className="mb-4">
              {!showAchForm ? (
                <button onClick={() => setShowAchForm(true)} className="w-full bg-white rounded-lg shadow p-4 text-left text-gray-400 hover:text-gray-600 text-sm border-2 border-dashed border-gray-200 hover:border-[#c9a227]">
                  + Share an achievement...
                </button>
              ) : (
                <form onSubmit={handlePostAchievement} className="bg-white rounded-lg shadow p-5 space-y-3">
                  <input type="text" required placeholder="Achievement title" value={achForm.title} onChange={(e) => setAchForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-medium" />
                  <textarea required placeholder="Describe the achievement..." rows={4} value={achForm.content} onChange={(e) => setAchForm(f => ({ ...f, content: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  {achImage && (
                    <div className="relative">
                      <img src={achImage} alt="Preview" className="w-full max-h-64 object-contain rounded-md bg-gray-50 mx-auto block" />
                      <button type="button" onClick={() => setAchImage(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">&times;</button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-[#1a3a7a] hover:underline cursor-pointer">
                      {uploading ? "Uploading..." : "Add image"}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const url = await handleUploadImage(file); if (url) setAchImage(url);
                        e.target.value = "";
                      }} />
                    </label>
                    {user?.role === "brod" && <span className="text-xs text-amber-600">* Requires admin/board approval</span>}
                    <div className="flex-1" />
                    <button type="button" onClick={() => { setShowAchForm(false); setAchImage(null); }} className="px-3 py-1.5 text-sm text-gray-500">Cancel</button>
                    <button type="submit" disabled={achPosting} className="px-4 py-1.5 bg-[#c9a227] text-white rounded-md text-sm font-medium hover:bg-[#b08f1f] disabled:opacity-50">
                      {achPosting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {achievements.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No achievements yet</div>}

          {achievements.map((a) => (
            <div key={a.id} className={`bg-white rounded-lg shadow mb-4 overflow-hidden ${!a.approved ? "border-l-4 border-amber-400" : ""}`}>
              <div className="p-5">
                {!a.approved && (
                  <div className="flex items-center gap-2 mb-3 bg-amber-50 rounded-md px-3 py-2">
                    <span className="text-xs text-amber-700 font-medium">Pending Approval</span>
                    {(user?.role === "admin" || user?.role === "board_member") && (
                      <div className="flex gap-2 ml-auto">
                        <button onClick={() => handleApproveAchievement(a.id, true)} className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Approve</button>
                        <button onClick={() => handleDeleteAchievement(a.id)} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Reject</button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{a.title}</h3>
                    <p className="text-xs text-gray-400">
                      {a.members?.full_name}
                      <span className="ml-2">{timeAgo(a.created_at)}</span>
                    </p>
                  </div>
                  {(user?.role === "admin" || user?.role === "board_member") && a.approved && (
                    <button onClick={() => handleDeleteAchievement(a.id)} className="text-gray-300 hover:text-red-500 text-sm">&times;</button>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.content}</p>
                {a.image_url && (
                  <img src={a.image_url} alt="" className="w-full max-h-96 object-contain rounded-md bg-gray-50 mx-auto block mt-3" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
