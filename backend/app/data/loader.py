"""Load explanation data from JSON."""
import json
import os
from typing import List


def load_explanations() -> List[dict]:
    """Load explanations from explanations.json."""
    data_dir = os.path.dirname(__file__)
    filepath = os.path.join(data_dir, "explanations.json")

    with open(filepath, "r") as f:
        data = json.load(f)

    return data["explanations"]
