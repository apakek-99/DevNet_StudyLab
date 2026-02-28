"""
Python Code Grader

Runs student-submitted Python code in an isolated subprocess with a timeout,
captures stdout/stderr, and compares against expected output criteria.
"""

import subprocess
import sys
import tempfile
import os
from typing import Optional


def grade_submission(
    code: str,
    expected_output_contains: str = "",
    timeout: int = 10,
) -> dict:
    """
    Grade a Python code submission.

    Args:
        code: The student's Python source code.
        expected_output_contains: A substring that must appear in stdout
            for the submission to pass. If empty, any non-error execution passes.
        timeout: Maximum execution time in seconds.

    Returns:
        dict with keys: passed (bool), output (str), errors (str), score (float)
    """
    result = {
        "passed": False,
        "output": "",
        "errors": "",
        "score": 0.0,
    }

    # ------------------------------------------------------------------
    # Write code to a temporary file so we can run it in a subprocess.
    # ------------------------------------------------------------------
    tmp_fd = None
    tmp_path = None
    try:
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".py", prefix="studylab_grade_")
        with os.fdopen(tmp_fd, "w") as tmp_file:
            tmp_file.write(code)
        tmp_fd = None  # os.fdopen closed the fd

        # ------------------------------------------------------------------
        # Execute in a subprocess with restricted permissions.
        # ------------------------------------------------------------------
        proc = subprocess.run(
            [sys.executable, "-u", tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout,
            env={
                "PATH": os.environ.get("PATH", ""),
                "PYTHONPATH": "",
                "HOME": os.environ.get("HOME", "/tmp"),
                "LANG": "en_US.UTF-8",
            },
        )

        result["output"] = proc.stdout.strip()
        result["errors"] = proc.stderr.strip()

        # ------------------------------------------------------------------
        # Evaluate pass/fail
        # ------------------------------------------------------------------
        if proc.returncode != 0:
            # Code raised an unhandled exception
            result["passed"] = False
            result["score"] = 0.0
        elif expected_output_contains:
            if expected_output_contains.lower() in result["output"].lower():
                result["passed"] = True
                result["score"] = 1.0
            else:
                result["passed"] = False
                result["score"] = 0.25  # partial credit for running without errors
        else:
            # No specific expected output -- just needs to run cleanly
            result["passed"] = True
            result["score"] = 1.0

    except subprocess.TimeoutExpired:
        result["errors"] = (
            f"Execution timed out after {timeout} seconds. "
            "Check for infinite loops or blocking I/O."
        )
        result["passed"] = False
        result["score"] = 0.0

    except Exception as exc:
        result["errors"] = f"Grader error: {exc}"
        result["passed"] = False
        result["score"] = 0.0

    finally:
        # Clean up the temp file
        if tmp_fd is not None:
            try:
                os.close(tmp_fd)
            except OSError:
                pass
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return result
