
// Only updating the Dialog content part:
{showPostModal && profile && (
  <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
    <DialogContent className="sm:max-w-[650px] bg-black/90 border-white/10 h-[90vh] max-h-[90vh] p-0" hideCloseButton>
      <ScrollArea className="h-full max-h-[90vh] px-4 py-2">
        {posts.slice(selectedPostIndex).map((post) => (
          <div key={post.id} className="mb-6">
            <Post 
              {...post}
              user_id={post.user_id}
              showDetailOnClick={false}
              profiles={profile}
              currentUserId={async () => {
                const { data } = await supabase.auth.getUser();
                return data.user?.id || null;
              }}
            />
          </div>
        ))}
      </ScrollArea>
    </DialogContent>
  </Dialog>
)}
