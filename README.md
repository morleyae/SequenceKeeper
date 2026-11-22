# SequenceKeeper

SequenceKeeper is a CEP panel for Adobe Premiere Pro. It lists every sequence in the current project. Select one or more clips in the active timeline, then click a destination sequence to insert their source ranges in order after its last clip, without gaps.

## Install on macOS

1. Quit Premiere Pro.
2. Run `install-macos.command` from the extracted `SequenceKeeper` folder.
3. Start Premiere Pro and open **Window > Extensions (Legacy) > SequenceKeeper**.

If the panel does not appear, enable CEP debug mode in Terminal with `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`, then restart Premiere Pro.

## Notes

- The active sequence is shown as **Active** and cannot be selected as a destination.
- Drag the grip beside a sequence to change the panel order; the order is saved locally.
- **Remove all gaps** closes leading and internal gaps in the currently active sequence, moving later clips earlier.
- If a Premiere Pro version does not expose QE gap removal, SequenceKeeper closes fully empty gaps across audio and video tracks and repositions sequence markers and transitions. It stops without editing if a timeline item cannot be moved safely.
- Clips are inserted directly through Premiere's sequence API; timeline effects and keyframes are not copied.
- Clips with speed changes or reverse playback are not supported.
- The sequence list updates automatically when sequences are added, renamed, or switched.