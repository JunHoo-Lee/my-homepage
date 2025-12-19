---
trigger: always_on
---


# Git Auto-Sync Protocol
CRITICAL: You MUST follow this protocol at the end of every task, BEFORE calling \`notify_user\` to signal completion.

1. **Check**: Are there modified files?
2. **Execute**:
   - \`git add .\`
   - \`git commit -m "type: brief summary of changes"\` (Use conventional commits: feat, fix, style, refactor, docs)
   - \`git push origin main\`
3. **Verify**: Ensure the push was successful.
4. **Notify**: Only AFTER pushing may you call \`notify_user\` to inform the user.
EOF