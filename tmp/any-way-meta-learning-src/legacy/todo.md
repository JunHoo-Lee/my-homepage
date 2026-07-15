# TODO

## procedure

- [ ] Decide the tables of this paper
- [ ] Decide hyper-parameters of this paper
- [ ] 그리고 지금 notation도 완성 했고, any-way to any-way 컨셉을 쭉 가져가는 게.

## paper index

- [x] The nature of sampling method in meta learning
- [X] Describe the double-sided feature of sampling method
- [x] Describe mixup method in true classes
- [ ] Introduce how to inject label information
- [ ] Convex hall? Injecting more information benefits if it is approporiate (maybe not)
  - [ ] if we do, we should do some additional experiments
  - [ ] To show how does this injecting information is used
- [X] Introduce the method of any-way meta learning task
- [X] Introduce masking technique.
- [ ] Formulation 정하기
- [ ] Episodie learning paradigm

## Figure 

- [ ] Sampling method에 대한 figure 넣기, 특정 풀에서, 랜덤하게 온다는 것
- [ ] Method 1: Masking sample set.
- [ ] Method 2: auxiliary classifier, mixup figure.
- [ ] meta learning mixup 논문 읽기

## Table

- [ ] GBML 3개, MBML 2개
- [ ] GBML dataset,
- [ ] GBML cross-ataset
- [ ] GBML other architecture
- [ ] MBML label hallucination.

## 현재 진행 상황

- 3개 실험에 대해서 일단은 진행 완료. 이중 내가 핸들해야 할 게 어떤건지? 그거를 현호랑 이야기해야 함
- 먼저 마멜같은 경우에는, 이게 가장 컨셉을 그대로 가져가니까 이건 추가적으로 의논할 필요 없음
- 그리고 Label Hallucination. 이건 잘 된 거기는 한데, 추가적인 조건을 달았음. T_class로 학습하되, 이때 EMA로 선생을 학습시켜서 성능을 비교하는 것이기 때문. 이걸 내가 할까?
- 또 해야할 건, Prototype, 왜냐하면 GBML 하나, MAML 하나, 그리고 소타 하나.. 이런식으로 리포트하는게 좋을 것 같기 때문.


## 전체적인 가이드라인

- Meta learning에 대한 설명, few-shot 으로 새로운 class를 classify하는 abiliaty.순수하게 이 능력을 얻기 위해서 하는 방법 그러기 위해서는 few-shot learning을 하는 episode들을 여러개 만들어서,그 후 이런 episode들을 순차적으로 모델에서 학습시켜 meta-learning ability를 얻는 모델들이 대부분이고, 이러한 모델을 본 논문에서는 episode-based algorithm으로 분류하겠음. 
- 반면에 이렇게 episode-based 문제로 해당 문제를 푸는 것이 아닌, 해당 문제를 dataset-scarcity problem으로 분류해서 푸는 방법론들이 있음. 이들은 기존 큰 dataset의 정보를 이용해서 이를 해결하거나 \cite{label hallucination}, 혹은 augmentation, self-supervised learning으로 이를 해결하려는 방법론들이 있음. 이는 몇 장의 샘플만 보고 그 class에 대해서 정보를 얻을 수 있는 방법론이라고 할 수는 없지만, 그럼에도 불구하고 few-shot learning task라고 할 수 있음. 또한 해당하는 방식으로 문제를 풀었기에 일반적으로 episode-based learning task보다 성능이 뛰어나다는 특징이 있음.
- 본 논문에서는 이러한 상황에서, 결국 task-sampling method는 동일하다는 점에 주목하고, 또한 task-sampling method의 특이점에 주목하여 meta-learning을 바라보는 관점에 하나의 insight를 제공하고자 함.
- task sampling method는 다음과 같은 방식으로 이루어져 있음. 먼저 학습하고자 하는 (즉, 데이터가 속하는) distribution이 존재하고, 이곳에서 episode를 sampling 함. 이때의 가정은 모델이 새로운 episode를 아예 모른다고 가정하기 때문에 클래스를 몇 개 샘플링했다고 하더라도 그ㄱ클래스가 어디에 들어갈 지는 결정된 사안이 아님. 일반적으로 학습 전체 과정에서 모델의 output dimestion은 은 고정되어있기 때문에, 모델이 classify해야하는 task-label의 개수는 output dimension과 동일함. 이때 classify하는 task의 개수를 number of ways, 그리고 각 class를 support하는 sample의 개수를 number of shots라고 부를 것. 해당 설명은 figure를 보면 더 확실히 알 수 있음.
- 이를 살펴볼 때, 먼저 이전에 episode-learning based 모델의 경우 진짜 meta-learning ability를 가지고 있는 것에 가깝다고 했지만, task-label의 개수가 fixed되어 있다는 조건 때문에 진정한 meta-learning 능력을 가지고 있다고는 의문이 있음. 이는 애초에 desired way의 크기를 키운 다음에 더 작은 incoming task set에 대해서 inference하면 된느거 아닌가? 하는 의문이 생길 수 있지만, 이는 후술하겠지만 일반적으로 episoded-based 모델의 경우 학습한 way set 에 대해서만 성능이 나오고, 이와 다를 때 성능이 급격히 떨어지는 경향을 보임. 
- Task set을 sampling 하는 점의 특징은 이 뿐만이 아님, 왜냐하면 이렇게 task-label set을 고정해놓는다고 하더라도 , 각각의 label은 해당 task(episode)에서의 task-label을 맞추는 것일 뿐, 해당 neuron이 특별한 정보를 저장하는 것이 아니기 때문. 이 현상이 무엇인지 supervised learning과 비교해 보겠음.  supervised learning에서는 이러한 현상이 일어나지 않음. 만약 0번째 output에 class A를 assign해주었다면 0번째 output은 class A를 represent함. 이는 무엇을 의미하냐면, 새로운 task에 대해서 학습하기 이전의 초기 상태는 output neuron 서로 다르지 않다는 것임. 본 논문에서는 이러한 현상으f label equivalence로 지칭하겠음.
- 본 논문에서는 label-equivalence에 집중할 것인데, 왜냐하면 이러한 현상은 supervised learning의 일종이라고 볼 수 있는 few-shot learning의 고유한 현상임에도 불구하고, 이 equivalence 자체에 대해서 집중한 페이퍼는 거의 없었기 때문임. 본 논문에서는 이러한 현상을 분석하고, 또 이 현상에서 advantage를 얻을 수 있는 방법을 제시하고자 함. 결과적으로 우리의 논문은 few-shot learning에 대해서 label equivalence라는 키워드를 바탕으로 하나으ㅣ insight를 제공하고자 ㅎㅏa.
- label equivalence를 살펴보았을 때, 다음과 같은 질문은 자연스러움. 어차피 각 neuron이 equivalent하다면, 굳이 매 task에서 neuron의 개수와 task label의 개수를 맞출 필요가 없지 않은가? 만약 새로운 task의 label set이 3개라면, 우리는 output neuron중에서 3개를 골라서 이를 task-label이라고 하고 이 selection path에 대해서만 optimization을 하면 됨. 그렇다면 우리는 굳이 fixed-number of task label에 집착할 필요가 없으며, 더 나아가 few-shot learning의 과정을 좀더 일반화할 수 있음. 우리의 이야기는 이곳에서 시작됨. 우리의 첫 번째 contribution은 기존의 fixed-way few shot learning이 아닌, any-way few shot learning을 제시한다는 것. 우리는 단순히 any-way로 늘리는 것 뿐 아니라, 매 way의 성능이 fixed-way의 성능과 유사한 수준으로 만들어주는 이에 맞는 적절하고, 일반화된 학습 알고리즘을 제시하며, 오히려 fixed-way보다 성능이 더 좋을 수도 있다는 것을 보여줌 (이부분은 아직 데이터가 다 안나와서.. 추후 맞춰서 수저ㅇ)
- label equivalence는 또한 각각의 ㅐutput들이 class를 represent 할 수 없게 만듬. 이는 왜냐하면 episode-dependent하든, 아니든 간에 매 task 에 대한 정보는 전혀 없고, 또한 그 task가 실제로 어떤 class를 가지고 있는지는 전혀 상관이 없고, 또 모르기 때문. 이러한 현상을 놓고 본다면 supervised learning에 비해서 few-show classification task는 제공받는 정보의 차원이 하나 더 낮다고 생각할 수 있음. 비유하자면 supervised learning은 절대 좌표계 속에서 주어진 task를 푸는 거라면 few-shot learning의 경우는 각 task들이 서로 다르다는 사실만 알 고 있는, 상대 좌표계 속에서 문제를 푸는 것으로 보임. 본 논문에서는 해당하는 문제를 보완하여 학습 과정 속 ㅊlass-label information을 inject하는 알고리즘을 제시하였으며, 이 알고리즘이 training set과 distribution이 비슷한 test set이 아닌, distribution이 다른 더 practical한 환경에서도 마찬가지로 성능 개선을 늘릴 수 있음을 보여줌. 또한, 이를 통해서 few-shot learning task에 supervised learning에서 사용하는 기법ㅇ들을 적용할 수 있음을 보여줌. 위의 두 방법들에 대해서는 episode-based learning에서 가장 대표격인 MAML, ProtoNET에서 이것이 작동함을 보였음.
- 본 논문에서는 마지막으로 이러한 기법들이 episode-independent한 기법에 대해서도 적용 가능하다는 것을 보여줌. 기존의 episode-independent한 기법은 성능 면에서는 episode-based learning보다 도 좋을 수 있지만, 결국 이를 ㅇataset scarcity problem을 통해 문제를 풀기 때문에 이를 true meta learning 기법이라고 보기에는 무리가 있음. 본 논문에서는 특정한 제약조건을 추가하였을 때 모델이 previous episode에서 학습하여 크게 성능을 개선할 수 있음을 보여줌.
- 정리하자면, 본 논문에서는 task sampling method에 주목하였고, 이를 통하여 meta learning 기법들을 더욱 더 일반화하였으며 기존의 방식보다 더 인간의 classification 방식에 더 가까운 방식을 제안하였음. 우리는 앞으로도 ㄹew-shot classifciation에서 우리의 방법이 baseline으로 사용되어 더 일반화된 메타 능력 측정 방식이 되기를 기대함.

마지막 두개는 내용이 좀 어설퍼서 수정






본 논문에서는 가장 대중적으로 사용되는 기법인 mixup이 사용 가능하다는 것을 보여줌. 해당 방법론은 기존 meta-learning 문제들에서도 많이 제시되었으나, 이거싱 근본적으로 다른 것으s task label의 index를 바꾸지 않았다는 것임, 또한,



Rethinking few-shot image classification: A good embedding is all you need?