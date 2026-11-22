function sequenceKeeperEncode(value) {
    return encodeURIComponent(String(value));
}

function sequenceKeeperGetTimeTicks(time) {
    try {
        var ticks = Number(time && time.ticks);
        return isFinite(ticks) ? ticks : NaN;
    } catch (timeError) {
        return NaN;
    }
}

function sequenceKeeperGetSequenceEndTicks(sequence) {
    var latestEnd = 0;
    var trackGroups = [sequence.videoTracks, sequence.audioTracks];
    for (var groupIndex = 0; groupIndex < trackGroups.length; groupIndex++) {
        var tracks = trackGroups[groupIndex];
        if (!tracks) continue;
        for (var trackIndex = 0; trackIndex < tracks.numTracks; trackIndex++) {
            var track = tracks[trackIndex];
            if (!track || !track.clips) continue;
            for (var clipIndex = 0; clipIndex < track.clips.numItems; clipIndex++) {
                var endTicks = sequenceKeeperGetTimeTicks(track.clips[clipIndex].end);
                if (isFinite(endTicks) && endTicks > latestEnd) latestEnd = endTicks;
            }
        }
    }
    return String(latestEnd);
}

function sequenceKeeperGetTrackItemIds(sequence) {
    var ids = {};
    var trackGroups = [sequence.videoTracks, sequence.audioTracks];
    for (var groupIndex = 0; groupIndex < trackGroups.length; groupIndex++) {
        var tracks = trackGroups[groupIndex];
        if (!tracks) continue;
        for (var trackIndex = 0; trackIndex < tracks.numTracks; trackIndex++) {
            var track = tracks[trackIndex];
            if (!track || !track.clips) continue;
            for (var clipIndex = 0; clipIndex < track.clips.numItems; clipIndex++) {
                var nodeId = track.clips[clipIndex].nodeId;
                if (nodeId) ids["$" + String(nodeId)] = true;
            }
        }
    }
    return ids;
}

function sequenceKeeperGetNewTrackItems(sequence, previousIds) {
    var items = [];
    var trackGroups = [sequence.videoTracks, sequence.audioTracks];
    for (var groupIndex = 0; groupIndex < trackGroups.length; groupIndex++) {
        var tracks = trackGroups[groupIndex];
        if (!tracks) continue;
        for (var trackIndex = 0; trackIndex < tracks.numTracks; trackIndex++) {
            var track = tracks[trackIndex];
            if (!track || !track.clips) continue;
            for (var clipIndex = 0; clipIndex < track.clips.numItems; clipIndex++) {
                var clip = track.clips[clipIndex];
                var nodeId = clip && clip.nodeId;
                if (nodeId && !previousIds["$" + String(nodeId)]) items.push(clip);
            }
        }
    }
    return items;
}

function sequenceKeeperRemoveNewTrackItems(items) {
    for (var index = items.length - 1; index >= 0; index--) {
        if (!items[index] || typeof items[index].remove !== "function") return false;
        try { items[index].remove(false, false); }
        catch (removeError) { return false; }
    }
    return true;
}

function sequenceKeeperSelectedClipCount(sequence) {
    var selectedClips = [];
    var trackGroups = [sequence.videoTracks, sequence.audioTracks];
    for (var groupIndex = 0; groupIndex < trackGroups.length; groupIndex++) {
        var tracks = trackGroups[groupIndex];
        if (!tracks) continue;
        for (var trackIndex = 0; trackIndex < tracks.numTracks; trackIndex++) {
            var track = tracks[trackIndex];
            if (!track || !track.clips) continue;
            for (var clipIndex = 0; clipIndex < track.clips.numItems; clipIndex++) {
                var clip = track.clips[clipIndex];
                var selected = false;
                try { selected = typeof clip.isSelected === "function" ? clip.isSelected() : clip.isSelected === true; } catch (selectionError) {}
                if (selected) selectedClips.push({
                    clip: clip,
                    key: sequenceKeeperClipKey(clip),
                    startTicks: sequenceKeeperGetTimeTicks(clip.start),
                    endTicks: sequenceKeeperGetTimeTicks(clip.end)
                });
            }
        }
    }
    return selectedClips;
}

function sequenceKeeperTimeKey(time) {
    if (!time) return "";
    try { if (time.ticks !== undefined) return String(time.ticks); } catch (ticksError) {}
    try { if (time.seconds !== undefined) return Number(time.seconds).toFixed(7); } catch (secondsError) {}
    return String(time);
}

function sequenceKeeperClipKey(clip) {
    try {
        var sourceId = clip.projectItem && clip.projectItem.nodeId;
        if (!sourceId) return "";
        return String(sourceId) + "|" + String(clip.mediaType || clip.type || "") + "|" +
            sequenceKeeperTimeKey(clip.inPoint) + "|" + sequenceKeeperTimeKey(clip.outPoint);
    } catch (keyError) {
        return "";
    }
}

function sequenceKeeperGetClipKeySet(sequence) {
    var keys = {};
    var trackGroups = [sequence.videoTracks, sequence.audioTracks];
    for (var groupIndex = 0; groupIndex < trackGroups.length; groupIndex++) {
        var tracks = trackGroups[groupIndex];
        if (!tracks) continue;
        for (var trackIndex = 0; trackIndex < tracks.numTracks; trackIndex++) {
            var track = tracks[trackIndex];
            if (!track || !track.clips) continue;
            for (var clipIndex = 0; clipIndex < track.clips.numItems; clipIndex++) {
                var key = sequenceKeeperClipKey(track.clips[clipIndex]);
                if (key) keys["$" + key] = true;
            }
        }
    }
    return keys;
}

function sequenceKeeperPlural(count, singular, plural) {
    return count + " " + (count === 1 ? singular : plural);
}

function sequenceKeeperGetSequences() {
    if (!app.project) return "ERROR|No Premiere Pro project is open.";
    var sequences = app.project.sequences;
    if (!sequences || !sequences.numSequences) return "OK\n";
    var active = app.project.activeSequence;
    var rows = [];
    for (var index = 0; index < sequences.numSequences; index++) {
        var sequence = sequences[index];
        if (!sequence) continue;
        var sequenceId = sequence.sequenceID;
        if (sequenceId === undefined || sequenceId === null) continue;
        var isActive = active && String(active.sequenceID) === String(sequenceId) ? "1" : "0";
        rows.push(sequenceKeeperEncode(sequenceId) + "\t" + sequenceKeeperEncode(sequence.name || "Unnamed Sequence") + "\t" + isActive);
    }
    return "OK\n" + rows.join("\n");
}

function sequenceKeeperClipSide(clip) {
    var mediaType = String(clip.mediaType || "").toLowerCase();
    if (mediaType === "video" || Number(clip.type) === 1) return "video";
    if (mediaType === "audio" || Number(clip.type) === 2) return "audio";
    return "";
}

function sequenceKeeperCreateTime(ticks) {
    var time = new Time();
    time.ticks = String(Math.round(Number(ticks)));
    return time;
}

function sequenceKeeperCaptureProjectItemMarks(projectItem) {
    if (!projectItem || typeof projectItem.getInPoint !== "function" || typeof projectItem.getOutPoint !== "function") {
        throw new Error("Premiere Pro could not read the source clip's ProjectItem marks.");
    }
    return {
        inTicks: sequenceKeeperGetTimeTicks(projectItem.getInPoint()),
        videoOutTicks: sequenceKeeperGetTimeTicks(projectItem.getOutPoint(1)),
        audioOutTicks: sequenceKeeperGetTimeTicks(projectItem.getOutPoint(2))
    };
}

function sequenceKeeperSetProjectItemRange(projectItem, inTicks, outTicks) {
    if (typeof projectItem.setInPoint !== "function" || typeof projectItem.setOutPoint !== "function") {
        throw new Error("Premiere Pro cannot set a temporary source range for this ProjectItem.");
    }
    projectItem.setInPoint(String(Math.round(inTicks)), 4);
    projectItem.setOutPoint(String(Math.round(outTicks)), 1);
    projectItem.setOutPoint(String(Math.round(outTicks)), 2);
}

function sequenceKeeperRestoreProjectItemMarks(projectItem, marks) {
    if (!projectItem || !marks) return;
    if (isFinite(marks.inTicks)) {
        if (Math.round(marks.inTicks) === -400000 && typeof projectItem.clearInPoint === "function") projectItem.clearInPoint();
        else projectItem.setInPoint(String(Math.round(marks.inTicks)), 4);
    }
    if (isFinite(marks.videoOutTicks)) projectItem.setOutPoint(String(Math.round(marks.videoOutTicks)), 1);
    if (isFinite(marks.audioOutTicks)) projectItem.setOutPoint(String(Math.round(marks.audioOutTicks)), 2);
}

function sequenceKeeperRestoreActiveSequence(sequenceId) {
    try {
        var activeSequence = app.project.activeSequence;
        if (activeSequence && String(activeSequence.sequenceID) === String(sequenceId)) return true;
        app.project.openSequence(String(sequenceId));
        activeSequence = app.project.activeSequence;
        return !!activeSequence && String(activeSequence.sequenceID) === String(sequenceId);
    } catch (sequenceRestoreError) {
        return false;
    }
}

function sequenceKeeperMapCompactedTime(ticks, gaps) {
    var removedTicks = 0;
    for (var gapIndex = 0; gapIndex < gaps.length; gapIndex++) {
        if (ticks >= gaps[gapIndex].endTicks) {
            removedTicks += gaps[gapIndex].endTicks - gaps[gapIndex].startTicks;
        } else if (ticks > gaps[gapIndex].startTicks) {
            return gaps[gapIndex].startTicks - removedTicks;
        } else {
            break;
        }
    }
    return ticks - removedTicks;
}

function sequenceKeeperCompactEmptyGaps(sequence) {
    var clips = [];
    var transitions = [];
    var trackGroups = [sequence.videoTracks, sequence.audioTracks];
    for (var groupIndex = 0; groupIndex < trackGroups.length; groupIndex++) {
        var tracks = trackGroups[groupIndex];
        if (!tracks) continue;
        for (var trackIndex = 0; trackIndex < tracks.numTracks; trackIndex++) {
            var track = tracks[trackIndex];
            if (!track) continue;
            if (track.transitions) {
                for (var transitionIndex = 0; transitionIndex < track.transitions.numItems; transitionIndex++) {
                    transitions.push({ transition: track.transitions[transitionIndex] });
                }
            }
            if (!track.clips) continue;
            for (var clipIndex = 0; clipIndex < track.clips.numItems; clipIndex++) {
                var clip = track.clips[clipIndex];
                var startTicks = sequenceKeeperGetTimeTicks(clip && clip.start);
                var endTicks = sequenceKeeperGetTimeTicks(clip && clip.end);
                if (!isFinite(startTicks) || !isFinite(endTicks) || endTicks <= startTicks) {
                    return { error: "QE gap removal is unavailable, and the fallback could not read every clip's timeline range." };
                }
                clips.push({ clip: clip, startTicks: startTicks, endTicks: endTicks, shiftTicks: 0 });
            }
        }
    }

    if (!clips.length) return { gapCount: 0 };

    clips.sort(function (left, right) {
        if (left.startTicks !== right.startTicks) return left.startTicks - right.startTicks;
        return left.endTicks - right.endTicks;
    });
    var occupiedRanges = [];
    for (var clipRangeIndex = 0; clipRangeIndex < clips.length; clipRangeIndex++) {
        occupiedRanges.push({ startTicks: clips[clipRangeIndex].startTicks, endTicks: clips[clipRangeIndex].endTicks });
    }
    for (var transitionRangeIndex = 0; transitionRangeIndex < transitions.length; transitionRangeIndex++) {
        var transition = transitions[transitionRangeIndex].transition;
        var transitionStartTicks = sequenceKeeperGetTimeTicks(transition && transition.start);
        var transitionEndTicks = sequenceKeeperGetTimeTicks(transition && transition.end);
        if (!isFinite(transitionStartTicks) || !isFinite(transitionEndTicks) || transitionEndTicks <= transitionStartTicks) {
            return { error: "QE gap removal is unavailable, and the fallback could not read a transition's timeline range." };
        }
        transitions[transitionRangeIndex].startTicks = transitionStartTicks;
        transitions[transitionRangeIndex].endTicks = transitionEndTicks;
        occupiedRanges.push({ startTicks: transitionStartTicks, endTicks: transitionEndTicks });
    }
    occupiedRanges.sort(function (left, right) {
        if (left.startTicks !== right.startTicks) return left.startTicks - right.startTicks;
        return left.endTicks - right.endTicks;
    });
    var gaps = [];
    var occupiedUntil = 0;
    for (var sortedIndex = 0; sortedIndex < occupiedRanges.length; sortedIndex++) {
        if (occupiedRanges[sortedIndex].startTicks > occupiedUntil) {
            gaps.push({ startTicks: occupiedUntil, endTicks: occupiedRanges[sortedIndex].startTicks });
        }
        if (occupiedRanges[sortedIndex].endTicks > occupiedUntil) occupiedUntil = occupiedRanges[sortedIndex].endTicks;
    }
    if (!gaps.length) return { gapCount: 0 };

    for (var transitionPlanIndex = 0; transitionPlanIndex < transitions.length; transitionPlanIndex++) {
        var transitionPlan = transitions[transitionPlanIndex];
        transitionPlan.newStartTicks = sequenceKeeperMapCompactedTime(transitionPlan.startTicks, gaps);
        transitionPlan.newEndTicks = sequenceKeeperMapCompactedTime(transitionPlan.endTicks, gaps);
        if (Math.abs((transitionPlan.newStartTicks - transitionPlan.startTicks) -
            (transitionPlan.newEndTicks - transitionPlan.endTicks)) > 1) {
            return { error: "QE gap removal is unavailable, and a transition overlaps a gap that would change its duration." };
        }
    }
    var markers = null;
    var markerPlans = [];
    try { markers = sequence.markers; } catch (markerError) {}
    if (markers && markers.numMarkers > 0) {
        if (typeof markers.getFirstMarker !== "function" || typeof markers.getNextMarker !== "function") {
            return { error: "QE gap removal is unavailable, and this Premiere Pro version cannot reposition sequence markers through its scripting API." };
        }
        var marker = markers.getFirstMarker();
        for (var markerIndex = 0; marker && markerIndex < markers.numMarkers; markerIndex++) {
            var markerStartTicks = sequenceKeeperGetTimeTicks(marker.start);
            var markerEndTicks = sequenceKeeperGetTimeTicks(marker.end);
            if (!isFinite(markerStartTicks) || !isFinite(markerEndTicks) || markerEndTicks < markerStartTicks) {
                return { error: "QE gap removal is unavailable, and the fallback could not read every sequence marker's time range." };
            }
            markerPlans.push({
                marker: marker,
                startTicks: markerStartTicks,
                endTicks: markerEndTicks,
                newStartTicks: sequenceKeeperMapCompactedTime(markerStartTicks, gaps),
                newEndTicks: sequenceKeeperMapCompactedTime(markerEndTicks, gaps)
            });
            marker = markers.getNextMarker(marker);
        }
        if (markerPlans.length !== markers.numMarkers) {
            return { error: "QE gap removal is unavailable, and the fallback could not enumerate every sequence marker." };
        }
    }

    for (var clipPlanIndex = 0; clipPlanIndex < clips.length; clipPlanIndex++) {
        var shiftTicks = 0;
        for (var gapIndex = 0; gapIndex < gaps.length; gapIndex++) {
            if (gaps[gapIndex].endTicks <= clips[clipPlanIndex].startTicks) {
                shiftTicks += gaps[gapIndex].endTicks - gaps[gapIndex].startTicks;
            }
        }
        clips[clipPlanIndex].shiftTicks = shiftTicks;
        if (shiftTicks && typeof clips[clipPlanIndex].clip.move !== "function") {
            return { error: "QE gap removal is unavailable, and this Premiere Pro version cannot move every affected clip through its scripting API." };
        }
    }

    var movedClips = [];
    var movedMarkers = [];
    try {
        for (var moveIndex = 0; moveIndex < clips.length; moveIndex++) {
            var moveEntry = clips[moveIndex];
            if (!moveEntry.shiftTicks) continue;
            var offset = new Time();
            offset.ticks = String(-moveEntry.shiftTicks);
            movedClips.push(moveEntry);
            moveEntry.clip.move(offset);
            var movedStartTicks = sequenceKeeperGetTimeTicks(moveEntry.clip.start);
            if (!isFinite(movedStartTicks) || Math.abs(movedStartTicks - (moveEntry.startTicks - moveEntry.shiftTicks)) > 1) {
                throw new Error("Premiere Pro did not move a clip to the expected position.");
            }
        }
        for (var transitionMoveIndex = 0; transitionMoveIndex < transitions.length; transitionMoveIndex++) {
            var transitionMovePlan = transitions[transitionMoveIndex];
            var currentTransitionStartTicks = sequenceKeeperGetTimeTicks(transitionMovePlan.transition.start);
            var currentTransitionEndTicks = sequenceKeeperGetTimeTicks(transitionMovePlan.transition.end);
            if (currentTransitionStartTicks === transitionMovePlan.newStartTicks &&
                currentTransitionEndTicks === transitionMovePlan.newEndTicks) continue;
            if (typeof transitionMovePlan.transition.move !== "function") {
                throw new Error("Premiere Pro could not reposition a transition after closing the gap.");
            }
            var transitionOffset = new Time();
            transitionOffset.ticks = String(transitionMovePlan.newStartTicks - currentTransitionStartTicks);
            transitionMovePlan.transition.move(transitionOffset);
            currentTransitionStartTicks = sequenceKeeperGetTimeTicks(transitionMovePlan.transition.start);
            currentTransitionEndTicks = sequenceKeeperGetTimeTicks(transitionMovePlan.transition.end);
            if (Math.abs(currentTransitionStartTicks - transitionMovePlan.newStartTicks) > 1 ||
                Math.abs(currentTransitionEndTicks - transitionMovePlan.newEndTicks) > 1) {
                throw new Error("Premiere Pro did not move a transition to the expected position.");
            }
        }
        for (var markerMoveIndex = 0; markerMoveIndex < markerPlans.length; markerMoveIndex++) {
            var markerPlan = markerPlans[markerMoveIndex];
            if (markerPlan.newStartTicks === markerPlan.startTicks && markerPlan.newEndTicks === markerPlan.endTicks) continue;
            movedMarkers.push(markerPlan);
            markerPlan.marker.start = markerPlan.newStartTicks / 254016000000;
            markerPlan.marker.end = markerPlan.newEndTicks / 254016000000;
            if (Math.abs(sequenceKeeperGetTimeTicks(markerPlan.marker.start) - markerPlan.newStartTicks) > 1 ||
                Math.abs(sequenceKeeperGetTimeTicks(markerPlan.marker.end) - markerPlan.newEndTicks) > 1) {
                throw new Error("Premiere Pro did not move a sequence marker to the expected position.");
            }
        }
    } catch (moveError) {
        var rollbackFailed = false;
        for (var markerRollbackIndex = movedMarkers.length - 1; markerRollbackIndex >= 0; markerRollbackIndex--) {
            var markerRollback = movedMarkers[markerRollbackIndex];
            try {
                markerRollback.marker.start = markerRollback.startTicks / 254016000000;
                markerRollback.marker.end = markerRollback.endTicks / 254016000000;
                if (Math.abs(sequenceKeeperGetTimeTicks(markerRollback.marker.start) - markerRollback.startTicks) > 1 ||
                    Math.abs(sequenceKeeperGetTimeTicks(markerRollback.marker.end) - markerRollback.endTicks) > 1) rollbackFailed = true;
            } catch (markerRollbackError) {
                rollbackFailed = true;
            }
        }
        for (var rollbackIndex = movedClips.length - 1; rollbackIndex >= 0; rollbackIndex--) {
            var rollbackEntry = movedClips[rollbackIndex];
            var currentTicks = sequenceKeeperGetTimeTicks(rollbackEntry.clip.start);
            if (!isFinite(currentTicks) || Math.abs(currentTicks - rollbackEntry.startTicks) <= 1) continue;
            try {
                var restoreOffset = new Time();
                restoreOffset.ticks = String(rollbackEntry.startTicks - currentTicks);
                rollbackEntry.clip.move(restoreOffset);
                if (Math.abs(sequenceKeeperGetTimeTicks(rollbackEntry.clip.start) - rollbackEntry.startTicks) > 1) rollbackFailed = true;
            } catch (rollbackError) {
                rollbackFailed = true;
            }
        }
        for (var transitionRollbackIndex = transitions.length - 1; transitionRollbackIndex >= 0; transitionRollbackIndex--) {
            var transitionRollback = transitions[transitionRollbackIndex];
            var currentTransitionStart = sequenceKeeperGetTimeTicks(transitionRollback.transition.start);
            var currentTransitionEnd = sequenceKeeperGetTimeTicks(transitionRollback.transition.end);
            if (Math.abs(currentTransitionStart - transitionRollback.startTicks) <= 1 &&
                Math.abs(currentTransitionEnd - transitionRollback.endTicks) <= 1) continue;
            if (typeof transitionRollback.transition.move !== "function") {
                rollbackFailed = true;
                continue;
            }
            try {
                var transitionRestoreOffset = new Time();
                transitionRestoreOffset.ticks = String(transitionRollback.startTicks - currentTransitionStart);
                transitionRollback.transition.move(transitionRestoreOffset);
                if (Math.abs(sequenceKeeperGetTimeTicks(transitionRollback.transition.start) - transitionRollback.startTicks) > 1 ||
                    Math.abs(sequenceKeeperGetTimeTicks(transitionRollback.transition.end) - transitionRollback.endTicks) > 1) rollbackFailed = true;
            } catch (transitionRollbackError) {
                rollbackFailed = true;
            }
        }
        return { error: "Could not remove gaps: " + moveError.toString() + (rollbackFailed ? " Some timeline items could not be restored; inspect the sequence before continuing." : " The attempted changes were rolled back.") };
    }
    return { gapCount: gaps.length };
}

function sequenceKeeperRemoveGaps() {
    if (!app.project) return "ERROR|No Premiere Pro project is open.";
    var activeSequence = app.project.activeSequence;
    if (!activeSequence) return "ERROR|Open a sequence before removing gaps.";
    var qeSequence = null;
    try {
        if (typeof app.enableQE === "function") {
            app.enableQE();
            var qeProject = typeof qe !== "undefined" && qe.project ? qe.project : null;
            qeSequence = qeProject && typeof qeProject.getActiveSequence === "function" ? qeProject.getActiveSequence() : null;
        }
    } catch (qeError) {}
    if (qeSequence && typeof qeSequence.removeGaps === "function") {
        try {
        qeSequence.removeGaps();
        return "OK|" + sequenceKeeperEncode("Removed all gaps from \"" + activeSequence.name + "\".");
        } catch (removeGapsError) {
            return "ERROR|" + sequenceKeeperEncode("Could not remove gaps: " + removeGapsError.toString());
        }
    }
    var fallbackResult = sequenceKeeperCompactEmptyGaps(activeSequence);
    if (fallbackResult.error) return "ERROR|" + sequenceKeeperEncode(fallbackResult.error);
    var resultMessage = fallbackResult.gapCount
        ? "Removed " + sequenceKeeperPlural(fallbackResult.gapCount, "gap", "gaps") + " from \"" + activeSequence.name + "\"."
        : "No gaps found in \"" + activeSequence.name + "\".";
    return "OK|" + sequenceKeeperEncode(resultMessage);
}

function sequenceKeeperDirectInsertToSequence(targetId) {
    if (!app.project) return "ERROR|No Premiere Pro project is open.";
    var source = app.project.activeSequence;
    if (!source) return "ERROR|Open a source sequence and select clips in its timeline first.";
    targetId = String(targetId);

    var sequences = app.project.sequences;
    var target = null;
    for (var sequenceIndex = 0; sequenceIndex < sequences.numSequences; sequenceIndex++) {
        var sequence = sequences[sequenceIndex];
        if (sequence && String(sequence.sequenceID) === targetId) {
            target = sequence;
            break;
        }
    }
    if (!target) return "ERROR|The destination sequence was not found.";
    if (String(source.sequenceID) === targetId) return "ERROR|The source sequence is already active.";
    if (typeof target.insertClip !== "function") return "ERROR|This Premiere Pro version does not expose direct timeline insertion.";

    var selectedClips = sequenceKeeperSelectedClipCount(source);
    if (!selectedClips.length) return "ERROR|Select at least one clip in the source timeline.";

    var timebaseTolerance = Math.max(1, Number(source.timebase) || 1);
    var groups = [];
    var groupKeys = [];
    for (var selectedIndex = 0; selectedIndex < selectedClips.length; selectedIndex++) {
        var selectedEntry = selectedClips[selectedIndex];
        var selectedItem = selectedEntry.clip;
        var projectItem = selectedItem.projectItem;
        var projectItemId = projectItem && projectItem.nodeId;
        var sourceInTicks = sequenceKeeperGetTimeTicks(selectedItem.inPoint);
        var sourceOutTicks = sequenceKeeperGetTimeTicks(selectedItem.outPoint);
        var timelineDurationTicks = selectedEntry.endTicks - selectedEntry.startTicks;
        if (!projectItem || !projectItemId || !isFinite(sourceInTicks) || !isFinite(sourceOutTicks) || sourceOutTicks <= sourceInTicks) {
            return "ERROR|A selected clip has no usable source item or source range.";
        }
        if (!isFinite(selectedEntry.startTicks) || !isFinite(selectedEntry.endTicks) || timelineDurationTicks <= 0) {
            return "ERROR|A selected clip has an invalid timeline range.";
        }
        try {
            if (typeof selectedItem.getSpeed === "function" && Math.abs(Number(selectedItem.getSpeed()) - 1) > 0.0001) {
                return "ERROR|Direct insertion supports normal-speed clips only; a selected clip is retimed.";
            }
            if (typeof selectedItem.isSpeedReversed === "function" && selectedItem.isSpeedReversed()) {
                return "ERROR|Direct insertion does not support reversed clips yet.";
            }
        } catch (speedError) {
            return "ERROR|Could not verify the selected clip's playback speed.";
        }
        if (Math.abs((sourceOutTicks - sourceInTicks) - timelineDurationTicks) > timebaseTolerance) {
            return "ERROR|A selected clip's source duration differs from its timeline duration; speed changes are not supported.";
        }

        var side = sequenceKeeperClipSide(selectedItem);
        if (!side) return "ERROR|Premiere Pro could not determine whether a selected clip is audio or video.";
        var matchedGroup = null;
        for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
            var candidateGroup = groups[groupIndex];
            if (candidateGroup.projectItemId === String(projectItemId) &&
                Math.abs(candidateGroup.startTicks - selectedEntry.startTicks) <= timebaseTolerance &&
                Math.abs(candidateGroup.endTicks - selectedEntry.endTicks) <= timebaseTolerance) {
                matchedGroup = candidateGroup;
                break;
            }
        }
        if (matchedGroup) {
            if (Math.abs(matchedGroup.sourceInTicks - sourceInTicks) > timebaseTolerance ||
                Math.abs(matchedGroup.sourceOutTicks - sourceOutTicks) > timebaseTolerance) {
                return "ERROR|The selected linked audio and video clips use different source ranges.";
            }
            matchedGroup[side + "Selected"] = true;
            if (selectedEntry.key) matchedGroup.keys.push(selectedEntry.key);
        } else {
            var group = {
                projectItem: projectItem,
                projectItemId: String(projectItemId),
                sourceInTicks: sourceInTicks,
                sourceOutTicks: sourceOutTicks,
                startTicks: selectedEntry.startTicks,
                endTicks: selectedEntry.endTicks,
                durationTicks: sourceOutTicks - sourceInTicks,
                videoSelected: side === "video",
                audioSelected: side === "audio",
                keys: selectedEntry.key ? [selectedEntry.key] : [],
                order: selectedIndex
            };
            groups.push(group);
        }
    }

    groups.sort(function (left, right) {
        if (left.startTicks !== right.startTicks) return left.startTicks - right.startTicks;
        return left.order - right.order;
    });

    var targetKeys = sequenceKeeperGetClipKeySet(target);
    var uniqueGroups = [];
    var duplicateGroupCount = 0;
    for (var groupCheckIndex = 0; groupCheckIndex < groups.length; groupCheckIndex++) {
        var groupKeysForItem = groups[groupCheckIndex].keys;
        var alreadyPresent = false;
        for (var groupKeyIndex = 0; groupKeyIndex < groupKeysForItem.length; groupKeyIndex++) {
            if (targetKeys["$" + groupKeysForItem[groupKeyIndex]]) alreadyPresent = true;
        }
        if (alreadyPresent) duplicateGroupCount++;
        else uniqueGroups.push(groups[groupCheckIndex]);
    }
    if (!uniqueGroups.length) {
        return "WARN|" + sequenceKeeperEncode("All " + sequenceKeeperPlural(duplicateGroupCount, "selected clip is", "selected clips are") +
            " already in the destination. Nothing was inserted.");
    }

    var targetWasActive = String(app.project.activeSequence.sequenceID) === targetId;
    if (!targetWasActive) app.project.openSequence(targetId);
    target = app.project.activeSequence;
    if (!target || String(target.sequenceID) !== targetId) {
        sequenceKeeperRestoreActiveSequence(source.sequenceID);
        return "ERROR|Premiere Pro did not activate the destination sequence.";
    }

    var originalTargetIds = sequenceKeeperGetTrackItemIds(target);
    var insertionTicks = Number(sequenceKeeperGetSequenceEndTicks(target));
    if (!isFinite(insertionTicks)) {
        sequenceKeeperRestoreActiveSequence(source.sequenceID);
        return "ERROR|Could not determine the destination sequence end.";
    }
    try {
        for (var insertIndex = 0; insertIndex < uniqueGroups.length; insertIndex++) {
            var insertionGroup = uniqueGroups[insertIndex];
            var beforeInsertIds = sequenceKeeperGetTrackItemIds(target);
            var insertTime = sequenceKeeperCreateTime(insertionTicks);
            var videoTrackIndex = insertionGroup.videoSelected ? 0 : -1;
            var audioTrackIndex = insertionGroup.audioSelected ? 0 : -1;
            var originalProjectItemMarks = sequenceKeeperCaptureProjectItemMarks(insertionGroup.projectItem);
            var insertResult;
            try {
                sequenceKeeperSetProjectItemRange(insertionGroup.projectItem, insertionGroup.sourceInTicks, insertionGroup.sourceOutTicks);
                insertResult = target.insertClip(insertionGroup.projectItem, insertTime, videoTrackIndex, audioTrackIndex);
            } finally {
                sequenceKeeperRestoreProjectItemMarks(insertionGroup.projectItem, originalProjectItemMarks);
            }
            if (insertResult === false) throw new Error("Premiere Pro rejected a direct clip insertion.");

            var newItems = sequenceKeeperGetNewTrackItems(target, beforeInsertIds);
            var matchedItems = [];
            var targetTolerance = Math.max(1, Number(target.timebase) || 1);
            for (var newItemIndex = 0; newItemIndex < newItems.length; newItemIndex++) {
                var newItem = newItems[newItemIndex];
                var newProjectItemId = newItem.projectItem && newItem.projectItem.nodeId;
                var newStartTicks = sequenceKeeperGetTimeTicks(newItem.start);
                if (String(newProjectItemId) === insertionGroup.projectItemId &&
                    isFinite(newStartTicks) && Math.abs(newStartTicks - insertionTicks) <= targetTolerance) {
                    matchedItems.push(newItem);
                }
            }
            if (!matchedItems.length) throw new Error("Premiere Pro inserted no identifiable clip from the selected source item.");

            var foundVideo = false;
            var foundAudio = false;
            for (newItemIndex = 0; newItemIndex < matchedItems.length; newItemIndex++) {
                var insertedItem = matchedItems[newItemIndex];
                var insertedSide = sequenceKeeperClipSide(insertedItem);
                if ((insertedSide === "video" && !insertionGroup.videoSelected) ||
                    (insertedSide === "audio" && !insertionGroup.audioSelected)) {
                    if (typeof insertedItem.remove !== "function") throw new Error("Premiere Pro could not remove an unselected audio/video component.");
                    insertedItem.remove(true, true);
                    continue;
                }
                if (insertedSide === "video") foundVideo = true;
                if (insertedSide === "audio") foundAudio = true;
                var insertedInTicks = sequenceKeeperGetTimeTicks(insertedItem.inPoint);
                var insertedOutTicks = sequenceKeeperGetTimeTicks(insertedItem.outPoint);
                if (Math.abs(insertedInTicks - insertionGroup.sourceInTicks) > targetTolerance ||
                    Math.abs(insertedOutTicks - insertionGroup.sourceOutTicks) > targetTolerance) {
                    throw new Error("Premiere Pro inserted the full source instead of the selected in/out range.");
                }
            }
            if ((insertionGroup.videoSelected && !foundVideo) || (insertionGroup.audioSelected && !foundAudio)) {
                throw new Error("Premiere Pro did not create all selected audio/video components.");
            }
            insertionTicks += insertionGroup.durationTicks;
        }
    } catch (insertError) {
        var rollbackItems = sequenceKeeperGetNewTrackItems(target, originalTargetIds);
        var rolledBack = sequenceKeeperRemoveNewTrackItems(rollbackItems);
        var restoredSource = sequenceKeeperRestoreActiveSequence(source.sequenceID);
        return "ERROR|" + sequenceKeeperEncode("Direct clip insertion failed: " + insertError.toString() +
            (rolledBack ? " Inserted clips were removed." : " Some inserted clips may remain in the destination.") +
            (restoredSource ? " Returned to the source sequence." : " Could not return to the source sequence."));
    }

    var message = "Inserted " + sequenceKeeperPlural(uniqueGroups.length, "clip", "clips") + " directly after the last clip in \"" + target.name + "\".";
    if (!sequenceKeeperRestoreActiveSequence(source.sequenceID)) {
        return "WARN|" + sequenceKeeperEncode(message + " Premiere Pro could not return to the source sequence.");
    }
    if (duplicateGroupCount) {
        return "WARN|" + sequenceKeeperEncode("Skipped " + sequenceKeeperPlural(duplicateGroupCount, "clip", "clips") +
            " already in the destination. " + message);
    }
    return "OK|" + sequenceKeeperEncode(message);
}