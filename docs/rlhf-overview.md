# Reinforcement Learning from Human Feedback (RLHF)

Reinforcement Learning from Human Feedback (RLHF) is a training approach that
aligns large language models with human intent by incorporating curated human
preferences into the reinforcement learning loop. This document summarizes the
core workflow, benefits, limitations, and common applications of RLHF.

## How RLHF Works

1. **Collect human feedback** – Human annotators compare several model outputs
   and rank them according to preference, creating a dataset that reflects
   nuanced human judgments.
2. **Train a reward model** – The preference data is used to train a reward
   model that predicts how a human would rank new model outputs. This model
   becomes a fast, scalable proxy for direct human review.
3. **Optimize the main model** – Reinforcement learning algorithms such as
   Proximal Policy Optimization (PPO) fine-tune the base model to maximize the
   reward predicted by the reward model, nudging outputs toward those humans are
   most likely to prefer.

## Advantages

- **Aligns models with human values** – Embedding human preferences in the
  training signal encourages responses that are helpful, honest, and harmless.
- **Elevates performance on complex tasks** – For open-ended or subjective
  problems, RLHF captures qualitative guidance that is difficult to encode as
  explicit rules.
- **Improves safety** – Human-in-the-loop oversight helps steer models away from
  harmful, toxic, or misleading behavior.

## Limitations

- **Expensive and time-consuming** – Gathering high-quality human annotations at
  scale requires significant investment.
- **Sensitive to human bias** – Reward models inherit the biases present in
  annotator feedback, which can limit generalization.
- **Subjective and inconsistent signals** – Divergent preferences across
  annotators can confuse the model if not normalized.
- **Reward hacking** – Models may exploit flaws in the reward model, maximizing
  proxy scores without faithfully capturing human intent.

## Applications

- **Generative AI** – Improves conversational ability, reliability, and
  alignment in large language models such as ChatGPT.
- **Customer service chatbots** – Enhances helpfulness and tone when interacting
  with users.
- **Content moderation** – Helps detect and avoid generating unsafe or toxic
  content.
- **Robotics** – Guides robots toward safe, efficient behavior when navigating
  physical environments.
- **Game development** – Produces more engaging and realistic non-player
  characters and opponents.

## Further Reading

- [RLHF on Google Cloud](https://cloud.google.com/blog/products/ai-machine-learning/rlhf-on-google-cloud)
- [RLHF: The Engine Tuning Human Values into Large Language Models](https://ai.googleblog.com/2023/11/rlhf-engine-tuning-human-values-into.html)
