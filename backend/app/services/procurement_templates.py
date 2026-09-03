from app.models.procurement_checkpoint import (
    ProcurementCheckpointCode,
    ProcurementCheckpointPhase,
)


STANDARD_PROCUREMENT_CHECKPOINTS = [
    {
        "code": ProcurementCheckpointCode.ARTICLE_CHECKED.value,
        "label": "Артикул проверен",
        "phase": ProcurementCheckpointPhase.BEFORE_ORDER.value,
        "position": 1,
    },
    {
        "code": ProcurementCheckpointCode.DIMENSIONS_CHECKED.value,
        "label": "Размер проверен",
        "phase": ProcurementCheckpointPhase.BEFORE_ORDER.value,
        "position": 2,
    },
    {
        "code": ProcurementCheckpointCode.MATERIAL_CHECKED.value,
        "label": "Цвет / материал проверен",
        "phase": ProcurementCheckpointPhase.BEFORE_ORDER.value,
        "position": 3,
    },
    {
        "code": ProcurementCheckpointCode.QUANTITY_CHECKED.value,
        "label": "Количество проверено",
        "phase": ProcurementCheckpointPhase.BEFORE_ORDER.value,
        "position": 4,
    },
    {
        "code": ProcurementCheckpointCode.PRICE_CHECKED.value,
        "label": "Цена проверена",
        "phase": ProcurementCheckpointPhase.BEFORE_ORDER.value,
        "position": 5,
    },
    {
        "code": ProcurementCheckpointCode.QUOTE_RECEIVED.value,
        "label": "КП получено",
        "phase": ProcurementCheckpointPhase.BEFORE_ORDER.value,
        "position": 6,
    },
    {
        "code": ProcurementCheckpointCode.CLIENT_APPROVED.value,
        "label": "Клиент согласовал",
        "phase": ProcurementCheckpointPhase.BEFORE_ORDER.value,
        "position": 7,
    },
    {
        "code": ProcurementCheckpointCode.DELIVERY_TIME_CONFIRMED.value,
        "label": "Срок поставки подтверждён",
        "phase": ProcurementCheckpointPhase.BEFORE_ORDER.value,
        "position": 8,
    },
    {
        "code": ProcurementCheckpointCode.INVOICE_RECEIVED.value,
        "label": "Счёт получен",
        "phase": ProcurementCheckpointPhase.BEFORE_ORDER.value,
        "position": 9,
    },
    {
        "code": ProcurementCheckpointCode.PAYMENT_CONFIRMED.value,
        "label": "Оплата подтверждена",
        "phase": ProcurementCheckpointPhase.BEFORE_ORDER.value,
        "position": 10,
    },

    {
        "code": ProcurementCheckpointCode.ORDER_ACCEPTED.value,
        "label": "Заказ принят поставщиком",
        "phase": ProcurementCheckpointPhase.AFTER_ORDER.value,
        "position": 11,
    },
    {
        "code": ProcurementCheckpointCode.SHIPMENT_CONFIRMED.value,
        "label": "Отгрузка подтверждена",
        "phase": ProcurementCheckpointPhase.AFTER_ORDER.value,
        "position": 12,
    },
    {
        "code": ProcurementCheckpointCode.DELIVERY_SCHEDULED.value,
        "label": "Доставка согласована",
        "phase": ProcurementCheckpointPhase.AFTER_ORDER.value,
        "position": 13,
    },
    {
        "code": ProcurementCheckpointCode.RECEIVED_ON_SITE.value,
        "label": "Получено на объекте",
        "phase": ProcurementCheckpointPhase.AFTER_ORDER.value,
        "position": 14,
    },
    {
        "code": ProcurementCheckpointCode.ESTIMATE_UPDATED.value,
        "label": "Смета обновлена",
        "phase": ProcurementCheckpointPhase.AFTER_ORDER.value,
        "position": 15,
    },
    {
        "code": ProcurementCheckpointCode.SPECIFICATION_UPDATED.value,
        "label": "Спецификация обновлена",
        "phase": ProcurementCheckpointPhase.AFTER_ORDER.value,
        "position": 16,
    },
]