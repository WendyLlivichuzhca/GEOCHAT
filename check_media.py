with open('frontend/src/components/AutomationBuilder.jsx', 'r', encoding='utf-8') as f:
    c = f.read()
print('resolveMediaUrl in img:', 'resolveMediaUrl(blk.url)}' in c)
print('resolveMediaUrl in video:', 'resolveMediaUrl(blk.url)} controls' in c)
