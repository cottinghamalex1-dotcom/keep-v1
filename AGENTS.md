<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- KEEP is a frontend-only prototype: keep creation state locally within the home route, because no account, uploads, processing, or backend is part of this first release.
- Recipient viewing has its own public route without app navigation, so a keepsake tap can be demonstrated independently of the creator flow.
