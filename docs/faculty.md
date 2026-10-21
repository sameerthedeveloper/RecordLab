# Faculty desk

`/faculty` is a separate sign-in and dashboard where faculty check the records students hand in, then verify the
subject or send it back with a note.

## Flow
1. **Faculty** opens `/faculty`, signs in (email or Google) and sends an access request (name, department, college).
2. **Admin** opens `/admin/faculty` and approves it. That creates `faculty/<uid>`; declining deletes the request.
3. **Faculty** creates a class per subject. Its id is a 6-character join code (`classes/<code>`).
4. **Student** opens the join link (`/join/<code>`, copied from the class page with *Copy join link*), or opens a subject in their dashboard, chooses the *Hand in to faculty* icon and types the code. Every record in
   the subject is stamped `submittedTo: <code>` and `submissions/<code>_<studentUid>` is written as `pending`.
5. **Faculty** opens the class, reads the records exactly as they print, and chooses *Verify subject* or *Send back with note*.
   The student sees the verdict and note in the same dialog and can hand in again or take it back.

## Collections
| Path | Who writes | Who reads |
| --- | --- | --- |
| `facultyRequests/<uid>` | the person | them, admins |
| `faculty/<uid>` | admins | them, admins |
| `classes/<code>` | that faculty | any signed-in user can `get` by code; only the owner can list |
| `submissions/<code>_<studentUid>` | student (pending only) / faculty (verdict fields only) | both, admins |
| `documents/*` | owner | owner, admins, and the class faculty when `submittedTo` is that class's code |

## Setup
Deploy the rules: `firebase deploy --only firestore:rules`. The Firestore queries need no new indexes
(all use equality filters only, except the admin request list which orders by `requestedAt`: Firestore creates that single-field index itself).

## Notes
- Faculty see the live record, so edits a student makes after handing in are visible. Records added to the subject later
  are not shared until the student hands in again.
- A student who takes a subject back clears `submittedTo`, so the faculty can no longer read those records.

## "Verified by" mark
Once a faculty member verifies a subject, every record in it shows a green tick and "Verified by <faculty name>" with the date,
bottom right of the last page. It appears in the preview, print, PDF (editor and file explorer) and Word. It is read from the
student's own `submissions` row (`status == 'approved'`, matched by `folderId`). The faculty name is checked against the class
by the rules, and a student cannot set `approved`. Handing the subject in again resets it to waiting, so the mark goes away
until it is verified again. The canvas2pdf engine does not draw it yet.
